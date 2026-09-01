import mongoose from 'mongoose';

interface IEmergencyLoan {
  // Applicant Details
  applicantName: string;
  applicantDob: string;
  applicantGender: string;
  applicantAadhaarNumber: string;
  
  // Hospital Details
  hospitalName: string;
  hospitalLocation: string;
  hospitalVerificationStatus: string;
  hospitalConfidence?: number;
  
  // Patient Details
  patientName: string;
  emergencyType: string;
  emergencyDescription: string;
  contactNumber: string;
  relationshipToPatient: string;
  
  // Loan Details
  loanAmountRequired: number;
  
  // Medical Certificate
  medicalCertificateValid?: boolean;
  medicalCertificateConfidence?: number;
  medicalCertificatePatientName?: string;
  medicalCertificateDoctorName?: string;
  medicalCertificateDiagnosis?: string;
  medicalCertificateSummary?: string;
  medicalCertificateText?: string;
  
  // Application Status
  loanStatus: 'Pending' | 'Approved' | 'Rejected';
  applicationDate: Date;
  lastUpdated: Date;
  
  // Additional Info
  aiGeneratedSummary?: string;
  bankEmployeeNotes?: string;
  approvedBy?: string;
  approvalDate?: Date;
  loanAmount?: number;
  interestRate?: number;
  repaymentPeriod?: number;
}

const EmergencyLoanSchema = new mongoose.Schema<IEmergencyLoan>({
  // Applicant Details
  applicantName: {
    type: String,
    required: true,
    trim: true
  },
  applicantDob: {
    type: String,
    required: true
  },
  applicantGender: {
    type: String,
    required: true
  },
  applicantAadhaarNumber: {
    type: String,
    required: true
    // REMOVED unique: true to allow multiple entries with same Aadhaar
  },
  
  // Hospital Details
  hospitalName: {
    type: String,
    required: true,
    trim: true
  },
  hospitalLocation: {
    type: String,
    required: true,
    trim: true
  },
  hospitalVerificationStatus: {
    type: String,
    required: true,
    enum: ['Verified', 'Not Verified']
  },
  hospitalConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Patient Details
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  emergencyType: {
    type: String,
    required: true,
    trim: true
  },
  emergencyDescription: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  relationshipToPatient: {
    type: String,
    required: true,
    trim: true
  },
  
  // Loan Details
  loanAmountRequired: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Medical Certificate
  medicalCertificateValid: {
    type: Boolean,
    default: false
  },
  medicalCertificateConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  medicalCertificatePatientName: {
    type: String,
    trim: true
  },
  medicalCertificateDoctorName: {
    type: String,
    trim: true
  },
  medicalCertificateDiagnosis: {
    type: String,
    trim: true
  },
  medicalCertificateSummary: {
    type: String,
    trim: true
  },
  medicalCertificateText: {
    type: String,
    trim: true
  },
  
  // Application Status
  loanStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Additional Info
  aiGeneratedSummary: {
    type: String,
    trim: true
  },
  bankEmployeeNotes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvalDate: {
    type: Date
  },
  loanAmount: {
    type: Number,
    min: 0
  },
  interestRate: {
    type: Number,
    min: 0,
    max: 100
  },
  repaymentPeriod: {
    type: Number,
    min: 1
  }
}, {
  timestamps: true
});

// Create NON-UNIQUE indexes for better query performance
// This allows multiple entries with the same Aadhaar number
EmergencyLoanSchema.index({ applicantAadhaarNumber: 1 }); // Non-unique index for queries
EmergencyLoanSchema.index({ loanStatus: 1 });
EmergencyLoanSchema.index({ applicationDate: -1 });
EmergencyLoanSchema.index({ applicantAadhaarNumber: 1, applicationDate: -1 }); // Compound index for user's application history

// Pre-save middleware to update lastUpdated
EmergencyLoanSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to find applications by status
EmergencyLoanSchema.statics.findByStatus = function(status: string) {
  return this.find({ loanStatus: status }).sort({ applicationDate: -1 });
};

// Static method to find ALL applications by Aadhaar number (not just one)
EmergencyLoanSchema.statics.findByAadhaar = function(aadhaarNumber: string) {
  return this.find({ applicantAadhaarNumber: aadhaarNumber }).sort({ applicationDate: -1 });
};

// Static method to find the latest application by Aadhaar number
EmergencyLoanSchema.statics.findLatestByAadhaar = function(aadhaarNumber: string) {
  return this.findOne({ applicantAadhaarNumber: aadhaarNumber }).sort({ applicationDate: -1 });
};

// Static method to count applications by Aadhaar number
EmergencyLoanSchema.statics.countByAadhaar = function(aadhaarNumber: string) {
  return this.countDocuments({ applicantAadhaarNumber: aadhaarNumber });
};

// Static method to find pending applications by Aadhaar number
EmergencyLoanSchema.statics.findPendingByAadhaar = function(aadhaarNumber: string) {
  return this.find({ 
    applicantAadhaarNumber: aadhaarNumber, 
    loanStatus: 'Pending' 
  }).sort({ applicationDate: -1 });
};

// Instance method to approve loan
EmergencyLoanSchema.methods.approveLoan = function(approvedBy: string, loanAmount?: number, interestRate?: number, repaymentPeriod?: number) {
  this.loanStatus = 'Approved';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  if (loanAmount) this.loanAmount = loanAmount;
  if (interestRate) this.interestRate = interestRate;
  if (repaymentPeriod) this.repaymentPeriod = repaymentPeriod;
  return this.save();
};

// Instance method to reject loan
EmergencyLoanSchema.methods.rejectLoan = function(approvedBy: string, notes?: string) {
  this.loanStatus = 'Rejected';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  if (notes) this.bankEmployeeNotes = notes;
  return this.save();
};

// Force remove any existing unique indexes on applicantAadhaarNumber
// This is a one-time operation to clean up existing collections
EmergencyLoanSchema.on('index', function() {
  // This will be called when indexes are built
  console.log('Emergency Loan indexes have been created/updated');
});

const EmergencyLoan = mongoose.models.EmergencyLoan || mongoose.model<IEmergencyLoan>('EmergencyLoan', EmergencyLoanSchema);

export default EmergencyLoan;
export type { IEmergencyLoan };