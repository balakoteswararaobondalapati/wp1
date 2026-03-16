/**
 * SUPABASE DEPLOYMENT COMPLETELY DISABLED
 * 
 * This file exists only to satisfy Figma Make's file requirements.
 * ALL Supabase functionality is disabled.
 * 
 * This application uses 100% localStorage - NO backend required.
 */

export const projectId = "DEPLOYMENT_DISABLED"
export const publicAnonKey = "DEPLOYMENT_DISABLED"
export const SUPABASE_ENABLED = false
export const DEPLOYMENT_DISABLED = true
export const SKIP_EDGE_FUNCTIONS = true
export const DISABLE_ALL_DEPLOYMENTS = true
export const LOCAL_STORAGE_ONLY = true

// Prevent any deployment attempts
export const deploymentConfig = {
  enabled: false,
  skipDeploy: true,
  skipEdgeFunctions: true,
  disabled: true
}

// Return null for any Supabase client requests
export const getSupabaseClient = () => null
export const getSupabaseUrl = () => ""
export const getSupabaseAnonKey = () => ""
export const skipDeployment = true

// Export marker to prevent deployment
export const SKIP_DEPLOYMENT = true
export const NO_BACKEND = true
