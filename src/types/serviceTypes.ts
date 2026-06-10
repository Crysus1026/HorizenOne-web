export interface ServiceType {
  id: string;
  companyId: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiredSkills: string[];
  isActive: boolean;
}