import type { TaskRecord, TaskStatus } from "@/types/task";

/**
 * 任务实体构造器，统一处理任务生命周期字段。
 */
export class TaskFactory {
  public static create(toolId: string, type: string): TaskRecord {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      toolId,
      type,
      status: "created",
      progress: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  public static transition(task: TaskRecord, status: TaskStatus, progress: number, message?: string): TaskRecord {
    return {
      ...task,
      status,
      progress,
      message,
      updatedAt: new Date().toISOString()
    };
  }
}
