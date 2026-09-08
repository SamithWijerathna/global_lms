import { Response } from "express";

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  statusCode: number = 500,
  code: string = "INTERNAL_SERVER_ERROR",
  message: string = "An unexpected error occurred",
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
