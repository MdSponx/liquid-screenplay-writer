import { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  title: string;
  type: 'Movie' | 'Series';
  format: 'Movie' | 'Short Film' | 'Series' | 'Micro Drama';
  status: 'Draft' | 'In Progress' | 'Completed' | 'Archived';
  createdAt: string;
  updatedAt: string;
  created_at: string | Timestamp;
  updated_at: string | Timestamp;
  created_by: string;
  ownership: 'personal' | 'organization';
  organizationId?: string;
  scenes: number;
  episodes?: number;
  length: number;
  genre: string[];
  collaborators: Array<{
    id: string;
    email: string;
    role: 'Owner' | 'Editor' | 'Viewer';
  }>;
  isPinned: boolean;
  coverImage?: string;
  coverColor?: string;
  company?: {
    id: string;
    name: string;
  };
  total_blocks_count: number;
  total_scenes_count: number;
}

export interface ProjectFormData {
  title: string;
  coverImage?: File;
  coverImageUrl?: string;
  coverColor?: string;
  format: 'Movie' | 'Short Film' | 'Series' | 'Micro Drama';
  episodes?: number;
  length: number;
  ownership: 'personal' | 'organization';
  organizationId?: string;
  genre: string[];
  status: 'Draft' | 'In Progress' | 'Completed' | 'Archived';
  collaborators: Array<{
    id: string;
    email: string;
    role: 'Owner' | 'Editor' | 'Viewer';
  }>;
}