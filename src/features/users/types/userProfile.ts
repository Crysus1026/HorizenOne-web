export type AppRole =
  | "System Admin"
  | "Admin"
  | "Manager"
  | "Dispatcher"
  | "Technician";

export type UserProfile = {
  id: string;
  companyId: string;

  firstName: string;
  lastName: string;
  preferredName: string;

  email: string;
  phone: string;

  employeeId: string;
  jobTitle: string;
  department: string;
  managerUserId: string;
  hireDate: string;

  role: AppRole;
  projectIds: string[];

  profilePhotoUrl: string;

  isActive: boolean;

  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type UpdatePersonalInformationInput = {
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
};

export type UpdateEmploymentInformationInput = {
  employeeId: string;
  jobTitle: string;
  department: string;
  managerUserId: string;
  hireDate: string;
};