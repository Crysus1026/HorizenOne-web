export interface WorkOrder {
  id: string;
  companyId: string;

  customerId: string;
  customerName: string;

  serviceTypeId: string;
  serviceTypeName: string;

  status: "Scheduled" | "Assigned" | "Completed" | "Closed";

  scheduledDate: string;
  timeWindow: string;

  assignedTechnicianId: string;
  assignedTechnicianName: string;

  notes: string;
  isActive: boolean;
}