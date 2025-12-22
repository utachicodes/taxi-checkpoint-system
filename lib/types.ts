export type DriverLicenseStatus = "active" | "suspended" | "expired" | "revoked"
export type CheckpointType = "random" | "scheduled" | "incident"
export type RecordStatus = "clear" | "warning" | "violation" | "detained"
export type VehicleStatus = "active" | "inactive" | "impounded"

export interface Driver {
  id: string
  license_number: string
  full_name: string
  phone: string
  email?: string
  license_status: DriverLicenseStatus
  photo_url?: string
  date_of_birth: string
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  plate_number: string
  driver_id?: string
  make: string
  model: string
  year: number
  color: string
  vehicle_status: VehicleStatus
  type?: string
  insurance_expiry?: string
  last_inspection?: string
  created_at: string
  updated_at: string
  driver?: Driver
}

export interface Checkpoint {
  id: string
  name: string
  location: string
  latitude?: number
  longitude?: number
  checkpoint_type: CheckpointType
  is_active: boolean
  created_at: string
}

export interface Operator {
  id: string
  full_name: string
  badge_number: string
  role: string
  checkpoint_id?: string
  is_active: boolean
  created_at: string
}

export interface CheckpointRecord {
  id: string
  checkpoint_id: string
  operator_id: string
  driver_id: string
  vehicle_id: string
  record_status: RecordStatus
  notes?: string
  violation_details?: string
  fine_amount?: number
  photo_evidence_url?: string
  created_at: string
  checkpoint?: Checkpoint
  operator?: Operator
  driver?: Driver
  vehicle?: Vehicle
}

export interface Violation {
  id: string
  driver_id: string
  checkpoint_record_id?: string
  violation_type: string
  description?: string
  fine_amount: number
  is_paid: boolean
  created_at: string
}

export interface DailyPayment {
  id: string
  vehicle_id: string
  payment_date: string
  amount: number
  is_paid: boolean
  created_at: string
  vehicle?: Vehicle
}

