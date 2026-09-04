import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter an organization name." }).max(80),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter a department name." }).max(60),
});

export const renameDepartmentSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a department name." }).max(60),
});
