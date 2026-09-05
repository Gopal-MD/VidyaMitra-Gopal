import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, AuthContextType, SignupCredentials, InstitutionLoginCredentials } from '@/types/auth';
import { useToast } from '@/components/ui/use-toast';
import { authApi, setAuthToken, getAuthToken } from '@/lib/api';

const ADMIN_EMAILS = ['admin@vidyamitra.com'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.me();
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email.split('@')[0],
            isAdmin: data.user.isAdmin || ADMIN_EMAILS.includes(data.user.email),
            userType: data.user.userType || (data.user.isAdmin ? 'admin' : 'student'),
            studentCategory: data.user.studentCategory,
            institutionId: data.user.institutionId,
            institutionName: data.user.institutionName,
            institutionCode: data.user.institutionCode,
          });
        }
      } catch {
        // Token expired or invalid
        setAuthToken(null);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const data = await authApi.login(credentials.email, credentials.password);
      setAuthToken(data.token);

      const appUser: User = {
        id: data.user.id,
        email: data.user.email,
        isAdmin: data.user.isAdmin || ADMIN_EMAILS.includes(data.user.email),
        name: data.user.name || data.user.email.split('@')[0],
        userType: data.user.userType || (data.user.isAdmin ? 'admin' : 'student'),
        studentCategory: data.user.studentCategory,
        institutionId: data.user.institutionId,
        institutionName: data.user.institutionName,
      };

      setUser(appUser);

      toast({
        title: appUser.isAdmin ? 'Welcome, Admin!' : 'Welcome!',
        description: appUser.isAdmin
          ? 'You have successfully logged in as an administrator.'
          : 'You have successfully logged in.',
      });

      return appUser;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Invalid email or password. Please try again.');
    }
  };

  const institutionLogin = async (credentials: InstitutionLoginCredentials): Promise<User> => {
    try {
      const data = await authApi.institutionLogin(credentials.institutionId, credentials.password);
      setAuthToken(data.token);

      const appUser: User = {
        id: data.user.id,
        email: data.user.email,
        isAdmin: false,
        name: data.user.name,
        userType: 'institution',
        institutionCode: data.user.institutionCode,
      };

      setUser(appUser);

      toast({
        title: 'Welcome!',
        description: `Logged in as ${data.user.name}`,
      });

      return appUser;
    } catch (error: any) {
      console.error('Institution login error:', error);
      throw new Error(error.message || 'Invalid credentials. Please try again.');
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<User> => {
    try {
      if (ADMIN_EMAILS.includes(credentials.email)) {
        throw new Error('This email is reserved for admin access.');
      }

      const data = await authApi.signup(
        credentials.email, 
        credentials.password, 
        credentials.name,
        credentials.studentCategory,
        credentials.institutionId
      );
      setAuthToken(data.token);

      const appUser: User = {
        id: data.user.id,
        email: data.user.email,
        isAdmin: false,
        name: data.user.name || credentials.email.split('@')[0],
        userType: 'student',
        studentCategory: data.user.studentCategory,
        institutionId: data.user.institutionId,
        institutionName: data.user.institutionName,
      };

      setUser(appUser);

      toast({
        title: 'Account created!',
        description: 'You have successfully signed up and logged in.',
      });

      return appUser;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setAuthToken(null);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || false,
        isInstitution: user?.userType === 'institution',
        login,
        institutionLogin,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
