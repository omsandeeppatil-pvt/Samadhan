import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/lib/mongodb';
import EmergencyLoan from '@/database/models/EmergencyLoan';

// POST - Create new emergency loan application
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    // Updated required fields - removed applicantVerificationStatus, added loanAmountRequired
    const requiredFields = [
      'applicantName',
      'applicantDob',
      'applicantGender',
      'applicantAadhaarNumber',
      'hospitalName',
      'hospitalLocation',
      'hospitalVerificationStatus',
      'patientName',
      'emergencyType',
      'emergencyDescription',
      'contactNumber',
      'relationshipToPatient',
      'loanAmountRequired' // New required field
    ];
    
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // REMOVED: Check for existing application with same Aadhaar number
    // This allows multiple submissions with the same Aadhaar for demo purposes
    
    // Create new application (always allow creation)
    const newApplication = new EmergencyLoan({
      // Applicant Details - removed applicantVerificationStatus
      applicantName: body.applicantName,
      applicantDob: body.applicantDob,
      applicantGender: body.applicantGender,
      applicantAadhaarNumber: body.applicantAadhaarNumber,
      
      // Hospital Details
      hospitalName: body.hospitalName,
      hospitalLocation: body.hospitalLocation,
      hospitalVerificationStatus: body.hospitalVerificationStatus,
      hospitalConfidence: body.hospitalConfidence,
      
      // Patient Details
      patientName: body.patientName,
      emergencyType: body.emergencyType,
      emergencyDescription: body.emergencyDescription,
      contactNumber: body.contactNumber,
      relationshipToPatient: body.relationshipToPatient,
      
      // Loan Details - new required field
      loanAmountRequired: body.loanAmountRequired,
      
      // Medical Certificate (optional) - added medicalCertificateText
      medicalCertificateValid: body.medicalCertificateValid,
      medicalCertificateConfidence: body.medicalCertificateConfidence,
      medicalCertificatePatientName: body.medicalCertificatePatientName,
      medicalCertificateDoctorName: body.medicalCertificateDoctorName,
      medicalCertificateDiagnosis: body.medicalCertificateDiagnosis,
      medicalCertificateSummary: body.medicalCertificateSummary,
      medicalCertificateText: body.medicalCertificateText, // New optional field
      
      // Application Status
      loanStatus: body.loanStatus || 'Pending',
      aiGeneratedSummary: body.aiGeneratedSummary
    });
    
    const savedApplication = await newApplication.save();
    
    return NextResponse.json({
      success: true,
      message: 'Emergency loan application submitted successfully',
      applicationId: savedApplication._id,
      data: savedApplication
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating emergency loan application:', error);
    
    // REMOVED: Handle duplicate key error for Aadhaar number
    // Since we're allowing duplicates for demo, this is no longer needed
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error while creating application',
      error: error.message
    }, { status: 500 });
  }
}

// GET - Retrieve emergency loan applications
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const aadhaarNumber = searchParams.get('aadhaar');
    const applicationId = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    let query = {};
    
    // Build query based on parameters
    if (status) {
      query = { ...query, loanStatus: status };
    }
    
    if (aadhaarNumber) {
      // NOTE: This will now return ALL applications for this Aadhaar number
      // since we're allowing multiple submissions
      query = { ...query, applicantAadhaarNumber: aadhaarNumber };
    }
    
    if (applicationId) {
      const application = await EmergencyLoan.findById(applicationId);
      if (!application) {
        return NextResponse.json({
          success: false,
          message: 'Application not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        data: application
      });
    }
    
    // Get paginated results
    const skip = (page - 1) * limit;
    const applications = await EmergencyLoan.find(query)
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalCount = await EmergencyLoan.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error: any) {
    console.error('Error retrieving emergency loan applications:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while retrieving applications',
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Update emergency loan application
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { applicationId, ...updateData } = body;
    
    if (!applicationId) {
      return NextResponse.json({
        success: false,
        message: 'Application ID is required'
      }, { status: 400 });
    }
    
    const application = await EmergencyLoan.findById(applicationId);
    
    if (!application) {
      return NextResponse.json({
        success: false,
        message: 'Application not found'
      }, { status: 404 });
    }
    
    // Update application
    const updatedApplication = await EmergencyLoan.findByIdAndUpdate(
      applicationId,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication
    });
    
  } catch (error: any) {
    console.error('Error updating emergency loan application:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while updating application',
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Delete emergency loan application
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id');
    
    if (!applicationId) {
      return NextResponse.json({
        success: false,
        message: 'Application ID is required'
      }, { status: 400 });
    }
    
    const application = await EmergencyLoan.findById(applicationId);
    
    if (!application) {
      return NextResponse.json({
        success: false,
        message: 'Application not found'
      }, { status: 404 });
    }
    
    await EmergencyLoan.findByIdAndDelete(applicationId);
    
    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting emergency loan application:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while deleting application',
      error: error.message
    }, { status: 500 });
  }
}