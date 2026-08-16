export type Technician = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  companyId?: string;
  projectIds?: string[];
  role?: string;
  isActive?: boolean;
  technicianEnabled?: boolean;
  technicianId?: string;
};