import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/lib/mongodb';
import EmergencyLoan from '@/database/models/EmergencyLoan';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();

    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter object
    let filter: any = {};
    if (status && status !== 'all') {
      filter.loanStatus = status;
    }

    // Fetch emergency loan applications with pagination
    const applications = await EmergencyLoan.find(filter)
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await EmergencyLoan.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        current: page,
        total: totalPages,
        hasNext,
        hasPrev,
        count: applications.length,
        totalCount: total
      }
    });

  } catch (error) {
    console.error('Error fetching emergency loan applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch emergency loan applications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    // Create new emergency loan application
    const newApplication = new EmergencyLoan(body);
    const savedApplication = await newApplication.save();

    return NextResponse.json({
      success: true,
      data: savedApplication
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating emergency loan application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create emergency loan application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Update the application
    const updatedApplication = await EmergencyLoan.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedApplication
    });

  } catch (error) {
    console.error('Error updating emergency loan application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update emergency loan application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}