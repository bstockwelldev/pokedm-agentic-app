/**
 * Request Validation Middleware
 * Validates request body, query params, and route params
 */

import { z } from 'zod';

/**
 * Validate request body against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Query validation error',
          details: error.errors,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate route parameters against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parameter validation error',
          details: error.errors,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate user input for agent endpoint
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next middleware
 */
export function validateAgentRequest(req, res, next) {
  const AgentRequestSchema = z.object({
    userInput: z.string().min(1).max(10000),
    sessionId: z.string().uuid().optional(),
    model: z.string().optional(),
    campaignId: z.string().uuid().optional(),
    characterIds: z.array(z.string().uuid()).optional(),
  });

  try {
    req.body = AgentRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
    next(error);
  }
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  validateAgentRequest,
};
