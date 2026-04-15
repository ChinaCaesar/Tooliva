import { defineStore } from "pinia";
import type { TaskRecord } from "@/types/task";
import { TaskFactory } from "@/task/taskManager";

interface TaskState {
  activeTasks: TaskRecord[];
  historyTasks: TaskRecord[];
}

export const useTaskStore = defineStore("tasks", {
  state: (): TaskState => ({
    activeTasks: [],
    historyTasks: []
  }),
  actions: {
    createTask(toolId: string, type: string): TaskRecord {
      const task = TaskFactory.create(toolId, type);
      this.activeTasks = [task, ...this.activeTasks];
      return task;
    },
    updateTaskProgress(taskId: string, progress: number, message?: string): void {
      this.activeTasks = this.activeTasks.map((task) =>
        task.id === taskId ? TaskFactory.transition(task, "running", progress, message) : task
      );
    },
    completeTask(taskId: string, message?: string): void {
      this.finishTask(taskId, "completed", 100, message);
    },
    failTask(taskId: string, message?: string): void {
      this.finishTask(taskId, "failed", 100, message);
    },
    cancelTask(taskId: string, message?: string): void {
      this.finishTask(taskId, "cancelled", 0, message);
    },
    finishTask(taskId: string, status: "completed" | "failed" | "cancelled", progress: number, message?: string): void {
      const target = this.activeTasks.find((task) => task.id === taskId);
      if (!target) return;
      const finalTask = TaskFactory.transition(target, status, progress, message);
      this.activeTasks = this.activeTasks.filter((task) => task.id !== taskId);
      this.historyTasks = [finalTask, ...this.historyTasks];
    }
  }
});
