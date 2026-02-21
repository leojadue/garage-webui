export type User = {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: number;
  name: string;
  description: string;
};
