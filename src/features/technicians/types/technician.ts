export type Technician = {
  id: string;

  companyId: string;
  projectIds?: string[];

  firstName?: string;
  lastName?: string;
  email?: string;

  role?: string;
  isActive?: boolean;
};