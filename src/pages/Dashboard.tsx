import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Settings, Plus, UserPlus, Building, FileText, 
  Edit, MessageSquare, User, Users, Folder, BarChart2,
  Check, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import ProjectCard from '../components/Projects/ProjectCard';
import EditProjectDialog from '../components/Projects/EditProjectDialog';
import DeleteProjectDialog from '../components/Projects/DeleteProjectDialog';
import type { Project } from '../types/project';

interface ProjectMember {
  id: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  role: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface Activity {
  id: string;
  type: 'edit' | 'join' | 'comment';
  user: string;
  project: string;
  details?: string;
  time: string;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<Record<string, ProjectMember[]>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Mock activities data
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      type: 'edit',
      user: 'John',
      project: 'The Last Summer',
      details: 'scene 5',
      time: '2 hours ago',
    },
    {
      id: '2',
      type: 'join',
      user: 'Emma',
      project: 'Midnight Express',
      time: '5 hours ago',
    },
    {
      id: '3',
      type: 'comment',
      user: 'Michael',
      project: 'City Lights',
      details: 'scene 3',
      time: '1 day ago',
    },
  ]);

  // Fetch user profiles for members
  const fetchUserProfiles = async (emails: string[]) => {
    try {
      const uniqueEmails = [...new Set(emails)];
      const userProfiles: Record<string, UserProfile> = {};

      // Batch fetch user profiles
      const usersRef = collection(db, 'users');
      const userQueries = uniqueEmails.map(email => 
        getDocs(query(usersRef, where('email', '==', email)))
      );

      const userSnapshots = await Promise.all(userQueries);
      
      userSnapshots.forEach((snapshot, index) => {
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          userProfiles[uniqueEmails[index]] = {
            id: snapshot.docs[0].id,
            email: uniqueEmails[index],
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImage: userData.profileImage
          };
        }
      });

      return userProfiles;
    } catch (err) {
      console.error('Error fetching user profiles:', err);
      return {};
    }
  };

  // Fetch project members
  const fetchProjectMembers = async (projectId: string) => {
    try {
      const membersRef = collection(db, 'project_members');
      const memberQuery = query(
        membersRef,
        where('projectId', '==', projectId)
      );
      const memberSnapshot = await getDocs(memberQuery);
      
      const members: ProjectMember[] = memberSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectMember));

      // Fetch user profiles for all members
      const memberEmails = members.map(member => member.email);
      const profiles = await fetchUserProfiles(memberEmails);
      setUserProfiles(prev => ({ ...prev, ...profiles }));

      return members;
    } catch (err) {
      console.error(`Error fetching members for project ${projectId}:`, err);
      return [];
    }
  };

  // Fetch projects and their members
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError('');

        // Get all projects where user is a member
        const membersRef = collection(db, 'project_members');
        const memberQuery = query(
          membersRef,
          where('email', '==', user.email)
        );
        const memberSnapshot = await getDocs(memberQuery);

        // Track processed project IDs to avoid duplicates
        const processedProjectIds = new Set<string>();
        const projectPromises: Promise<Project | null>[] = [];
        const memberPromises: Promise<void>[] = [];

        memberSnapshot.docs.forEach((memberDoc) => {
          const memberData = memberDoc.data();
          // Only process each project once
          if (!processedProjectIds.has(memberData.projectId)) {
            processedProjectIds.add(memberData.projectId);
            projectPromises.push((async () => {
              const projectRef = doc(db, 'projects', memberData.projectId);
              const projectSnap = await getDoc(projectRef);

              if (projectSnap.exists()) {
                const projectData = projectSnap.data();

                // Get organization details if it's an organization project
                let company = undefined;
                if (projectData.ownership === 'organization' && projectData.organizationId) {
                  const orgRef = doc(db, 'organizations', projectData.organizationId);
                  const orgSnap = await getDoc(orgRef);
                  if (orgSnap.exists()) {
                    company = {
                      id: orgSnap.id,
                      name: orgSnap.data().name
                    };
                  }
                }

                // Fetch project members
                memberPromises.push((async () => {
                  const members = await fetchProjectMembers(projectSnap.id);
                  setProjectMembers(prev => ({
                    ...prev,
                    [projectSnap.id]: members
                  }));
                })());

                return {
                  id: projectSnap.id,
                  ...projectData,
                  company,
                  createdAt: projectData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
                  updatedAt: projectData.updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
                } as Project;
              }
              return null;
            })());
          }
        });

        await Promise.all(memberPromises);
        const projectResults = await Promise.all(projectPromises);
        const validProjects = projectResults.filter((p): p is Project => p !== null);

        // Sort by last updated
        validProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setProjects(validProjects);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(t('dashboard.error.loadProjects'));
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id, user?.email, t]);

  const handleStatusChange = async (projectId: string, memberId: string, newStatus: 'active' | 'inactive') => {
    try {
      const memberRef = doc(db, 'project_members', memberId);
      await updateDoc(memberRef, {
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      // Update local state
      setProjectMembers(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(member => 
          member.id === memberId ? { ...member, status: newStatus } : member
        )
      }));
    } catch (err) {
      console.error('Error updating member status:', err);
    }
  };

  const handleUpdateProject = async (projectData: Partial<Project>) => {
    if (!projectToEdit) return;

    try {
      const projectRef = doc(db, 'projects', projectToEdit.id);
      await updateDoc(projectRef, {
        ...projectData,
        updated_at: new Date().toISOString()
      });

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectToEdit.id ? { ...p, ...projectData } as Project : p
      ));

      setShowEditDialog(false);
      setProjectToEdit(null);
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));

      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(t('dashboard.error.deleteProject'));
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'edit':
        return <Edit size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'join':
        return <UserPlus size={18} className="text-green-600 dark:text-green-400" />;
      case 'comment':
        return <MessageSquare size={18} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <Edit size={18} />;
    }
  };

  const renderProjectCard = (project: Project) => {
    const members = projectMembers[project.id] || [];
    const activeMembers = members.filter(m => m.status === 'active');
    
    // Map members to include their profile data
    const membersWithProfiles = activeMembers.map(member => ({
      ...member,
      ...userProfiles[member.email]
    }));

    return (
      <ProjectCard
        key={`recent-project-${project.id}`}
        project={project}
        members={membersWithProfiles}
        onNavigate={navigate}
        onEdit={(project) => {
          setProjectToEdit(project);
          setShowEditDialog(true);
        }}
        onDelete={(project) => {
          setProjectToDelete(project);
          setShowDeleteDialog(true);
        }}
        isDarkMode={isDarkMode}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar activeItem="dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F2] dark:bg-gray-800">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="search"
                  placeholder={t('dashboard.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:border-[#E86F2C]"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.quickActions.title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => navigate('/editor')}
                className="flex items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#E86F2C] dark:hover:border-[#E86F2C] transition-colors"
              >
                <div className="w-10 h-10 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-lg flex items-center justify-center">
                  <Plus size={18} className="text-[#E86F2C]" />
                </div>
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-300">{t('dashboard.quickActions.newProject')}</span>
              </button>
              <button className="flex items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#E86F2C] dark:hover:border-[#E86F2C] transition-colors">
                <div className="w-10 h-10 bg-[#577B92]/10 dark:bg-[#577B92]/20 rounded-lg flex items-center justify-center">
                  <UserPlus size={18} className="text-[#577B92] dark:text-[#93c5fd]" />
                </div>
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-300">{t('dashboard.quickActions.inviteTeam')}</span>
              </button>
              <button className="flex items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#E86F2C] dark:hover:border-[#E86F2C] transition-colors">
                <div className="w-10 h-10 bg-[#1E4D3A]/10 dark:bg-[#1E4D3A]/20 rounded-lg flex items-center justify-center">
                  <Building size={18} className="text-[#1E4D3A] dark:text-[#6ee7b7]" />
                </div>
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-300">{t('dashboard.quickActions.manageCompany')}</span>
              </button>
            </div>
          </section>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.recentProjects.title')}</h2>
              <Link to="/projects" className="text-[#E86F2C] hover:text-[#E86F2C]/80">
                {t('dashboard.recentProjects.viewAll')}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.length > 0 ? (
                projects.slice(0, 3).map(renderProjectCard)
              ) : (
                <div className="col-span-3 text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <FileText size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
                  <h4 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-2">{t('dashboard.recentProjects.noProjects')}</h4>
                  <p className="text-[#577B92] dark:text-gray-400 text-sm max-w-sm mx-auto">
                    {t('dashboard.recentProjects.createFirst')}
                  </p>
                  <button
                    onClick={() => navigate('/projects')}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
                  >
                    <Plus size={18} className="mr-2" />
                    {t('dashboard.quickActions.newProject')}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.recentActivity.title')}</h2>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {activities.map((activity) => (
                <div key={`activity-${activity.id}`} className="p-4 flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.type === 'edit' 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : activity.type === 'join' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-900 dark:text-gray-100">
                      {activity.user} {activity.type === 'edit' && t('dashboard.recentActivity.edited')}
                      {activity.type === 'join' && t('dashboard.recentActivity.joined')}
                      {activity.type === 'comment' && t('dashboard.recentActivity.commented')}
                      {activity.details && ` ${activity.details} ${t('dashboard.recentActivity.in')}`}{' '}
                      <span className="font-medium">{activity.project}</span>
                    </p>
                    <p className="text-sm text-[#577B92] dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Edit Project Dialog */}
      {showEditDialog && projectToEdit && (
        <EditProjectDialog
          project={projectToEdit}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setProjectToEdit(null);
          }}
          onSubmit={handleUpdateProject}
        />
      )}

      {/* Delete Project Dialog */}
      {showDeleteDialog && projectToDelete && (
        <DeleteProjectDialog
          project={projectToDelete}
          onClose={() => {
            setShowDeleteDialog(false);
            setProjectToDelete(null);
          }}
          onConfirm={handleDeleteProject}
        />
      )}
    </div>
  );
};

export default Dashboard;