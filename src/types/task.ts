export type TaskStatus = "created" | "running" | "completed" | "failed" | "cancelled";

export interface TaskRecord {
  id: string;
  type: string;
  toolId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}
