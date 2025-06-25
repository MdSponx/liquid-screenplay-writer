import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';
import ProjectHeader from '../../components/Projects/ProjectHeader';
import ProjectFilters from '../../components/Projects/ProjectFilters';
import ProjectList from '../../components/Projects/ProjectList';
import ProjectCard from '../../components/Projects/ProjectCard';
import CreateProjectDialog from '../../components/Projects/CreateProjectDialog';
import DeleteProjectDialog from '../../components/Projects/DeleteProjectDialog';
import EditProjectDialog from '../../components/Projects/EditProjectDialog';
import type { Project, ProjectFormData } from '../../types/project';

interface ProjectMember {
  id: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  role: string;
  firstName?: string;
  lastName?: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

const ProjectsOverview: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Project states
  const [personalProjects, setPersonalProjects] = useState<Project[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<Record<string, ProjectMember[]>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const projectsRef = collection(db, 'projects');
        
        // Fetch personal projects
        const personalQuery = query(
          projectsRef,
          where('created_by', '==', user.id),
          where('ownership', '==', 'personal')
        );
        const personalSnapshot = await getDocs(personalQuery);
        const personalDocs = personalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));

        // Fetch project members for personal projects
        const personalMembers: Record<string, ProjectMember[]> = {};
        await Promise.all(
          personalDocs.map(async (project) => {
            personalMembers[project.id] = await fetchProjectMembers(project.id);
          })
        );

        setPersonalProjects(personalDocs);
        setProjectMembers(prev => ({ ...prev, ...personalMembers }));

        // Fetch company projects
        const companyQuery = query(
          projectsRef,
          where('created_by', '==', user.id),
          where('ownership', '==', 'organization')
        );
        const companySnapshot = await getDocs(companyQuery);
        const companyDocs = companySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));

        // Fetch project members for company projects
        const companyMembers: Record<string, ProjectMember[]> = {};
        await Promise.all(
          companyDocs.map(async (project) => {
            companyMembers[project.id] = await fetchProjectMembers(project.id);
          })
        );

        setCompanyProjects(companyDocs);
        setProjectMembers(prev => ({ ...prev, ...companyMembers }));

      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(t('projects.errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id, t]);

  const handleCreateProject = async (projectData: ProjectFormData) => {
    if (!user?.id || !user?.email) return;

    try {
      // Create project document
      const projectRef = await addDoc(collection(db, 'projects'), {
        title: projectData.title,
        format: projectData.format,
        type: projectData.format === 'Series' || projectData.format === 'Micro Drama' ? 'Series' : 'Movie',
        status: 'Draft',
        episodes: projectData.episodes,
        length: projectData.length,
        ownership: projectData.ownership,
        organizationId: projectData.organizationId,
        genre: projectData.genre,
        coverImage: projectData.coverImageUrl,
        coverColor: projectData.coverColor,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isPinned: false,
        scenes: 0,
        collaborators: [{
          id: user.id,
          email: user.email,
          role: 'Owner'
        }]
      });

      // Add owner to project_members collection
      await addDoc(collection(db, 'project_members'), {
        projectId: projectRef.id,
        email: user.email,
        role: 'Project Admin',
        status: 'active',
        invited_by: user.id,
        invited_at: serverTimestamp(),
        permissions: {
          writing: true,
          elements: true,
          schedules: true,
          budgets: true,
          castCrew: true,
          files: true
        }
      });

      // If it's a company project, update organization's projects
      if (projectData.ownership === 'organization' && projectData.organizationId) {
        const orgRef = doc(db, 'organizations', projectData.organizationId);
        await updateDoc(orgRef, {
          projects: arrayUnion(projectRef.id)
        });
      }

      // Add to local state
      const newProject: Project = {
        id: projectRef.id,
        title: projectData.title,
        format: projectData.format,
        type: projectData.format === 'Series' || projectData.format === 'Micro Drama' ? 'Series' : 'Movie',
        status: 'Draft',
        episodes: projectData.episodes,
        length: projectData.length,
        ownership: projectData.ownership,
        organizationId: projectData.organizationId,
        genre: projectData.genre,
        coverImage: projectData.coverImageUrl,
        coverColor: projectData.coverColor,
        created_by: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: false,
        scenes: 0,
        collaborators: [{
          id: user.id,
          email: user.email,
          role: 'Owner'
        }]
      };

      if (projectData.ownership === 'organization') {
        setCompanyProjects(prev => [...prev, newProject]);
      } else {
        setPersonalProjects(prev => [...prev, newProject]);
      }

      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));

      if (projectToDelete.ownership === 'organization') {
        setCompanyProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      } else {
        setPersonalProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      }

      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(t('projects.errors.deleteFailed'));
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

      const updateProjects = (prev: Project[]) =>
        prev.map(p => p.id === projectToEdit.id ? { ...p, ...projectData } as Project : p);

      if (projectToEdit.ownership === 'organization') {
        setCompanyProjects(updateProjects);
      } else {
        setPersonalProjects(updateProjects);
      }

      setShowEditDialog(false);
      setProjectToEdit(null);
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
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
        key={project.id}
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
          <p className="text-[#577B92] dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar activeItem="projects" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <ProjectHeader onCreateProject={() => setShowCreateDialog(true)} />

          <ProjectFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            showTypeFilter={showTypeFilter}
            onShowTypeFilter={setShowTypeFilter}
            showStatusFilter={showStatusFilter}
            onShowStatusFilter={setShowStatusFilter}
          />

          <ProjectList
            title={t('projects.personal')}
            projects={personalProjects}
            viewMode={viewMode}
            renderProject={renderProjectCard}
            onCreateProject={() => setShowCreateDialog(true)}
            emptyStateText={t('projects.noPersonalProjects')}
            emptyStateAction={t('projects.createFirstProject')}
          />

          <ProjectList
            title={t('projects.company')}
            projects={companyProjects}
            viewMode={viewMode}
            renderProject={renderProjectCard}
            emptyStateText={t('projects.noCompanyProjects')}
            emptyStateAction={t('projects.joinCompany')}
          />
        </div>
      </div>

      <CreateProjectDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateProject}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        onClose={() => {
          setShowDeleteDialog(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
      />

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
    </div>
  );
};

export default ProjectsOverview;