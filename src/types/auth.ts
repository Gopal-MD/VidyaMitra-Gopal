
export type UserType = 'student' | 'admin' | 'institution';

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  name?: string;
  userType: UserType;
  studentCategory?: string;
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
}

export interface Institution {
  id: string;
  name: string;
  email: string;
  institution_code: string;
  institution_type: string;
  location?: string;
  contact_person?: string;
  phone?: string;
  website?: string;
  is_active: number;
  student_count?: number;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  institutionId?: string;
  studentCategory?: string;
}

export interface InstitutionLoginCredentials {
  institutionId: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name?: string;
  studentCategory?: string;
  institutionId?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstitution: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  institutionLogin: (credentials: InstitutionLoginCredentials) => Promise<User>;
  signup: (credentials: SignupCredentials) => Promise<User>;
  logout: () => void;
}
