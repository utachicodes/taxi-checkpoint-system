/**
 * Validation utilities for form inputs and data
 */

export const validators = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  },

  /**
   * Validate license plate format (basic validation for Senegalese plates)
   */
  plateNumber: (plate: string): boolean => {
    const cleaned = plate.trim().toUpperCase()
    // Basic validation: 3-15 alphanumeric characters, dashes allowed
    const plateRegex = /^[A-Z0-9-]{3,15}$/
    return plateRegex.test(cleaned) && cleaned.length >= 3
  },

  /**
   * Validate required field
   */
  required: (value: string | null | undefined): boolean => {
    return value !== null && value !== undefined && value.trim().length > 0
  },

  /**
   * Validate badge number format
   */
  badgeNumber: (badge: string): boolean => {
    const cleaned = badge.trim()
    // Format: TG-YYYY-XXXX or similar
    return cleaned.length >= 5 && /^[A-Z0-9-]+$/.test(cleaned)
  },
}

export type ValidationResult = {
  isValid: boolean
  message?: string
}

export function validatePlate(plate: string): ValidationResult {
  if (!validators.required(plate)) {
    return { isValid: false, message: "La plaque d'immatriculation est requise." }
  }
  
  if (!validators.plateNumber(plate)) {
    return { isValid: false, message: "Le format de la plaque d'immatriculation est invalide." }
  }
  
  return { isValid: true }
}

export function validateEmail(email: string): ValidationResult {
  if (!validators.required(email)) {
    return { isValid: false, message: "L'adresse email est requise." }
  }
  
  if (!validators.email(email)) {
    return { isValid: false, message: "Veuillez entrer une adresse email valide." }
  }
  
  return { isValid: true }
}

