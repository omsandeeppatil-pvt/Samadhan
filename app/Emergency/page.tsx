"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, Sparkles, Shield } from 'lucide-react';
import AadhaarVerify from '@/app/Emergency/Components/adhaarverify';
import HospitalVerify from '@/app/Emergency/Components/hospitalverify';
import Form from '@/app/Emergency/Components/form';
import Summary from '@/app/Emergency/Components/summary';
import { AadhaarCardInfo } from './Emergency_API/adhaarcard';
import { VerificationResult } from './Emergency_API/types';
import hospitalVerificationService from './Emergency_API/hospitalverification';
import { OCRResult } from './Emergency_API/ocr';

interface EmergencyFormData {
  patientName: string;
  emergencyType: string;
  emergencyDescription: string;
  medicalCertificate?: File;
  contactNumber: string;
  relationshipToPatient: string;
  loanAmountRequired: string;
}

type StepType = 'aadhaar' | 'hospital' | 'emergency' | 'summary';

export default function EmergencyLoanPage() {
  const [currentStep, setCurrentStep] = useState<StepType>('aadhaar');
  const [aadhaarInfo, setAadhaarInfo] = useState<AadhaarCardInfo | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalLocation, setHospitalLocation] = useState<string>('');
  const [hospitalVerificationResult, setHospitalVerificationResult] = useState<any>(null);
  const [emergencyFormData, setEmergencyFormData] = useState<EmergencyFormData>({
    patientName: '',
    emergencyType: '',
    emergencyDescription: '',
    contactNumber: '',
    relationshipToPatient: '',
    loanAmountRequired: ''
  });
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loanSummary, setLoanSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loanStatus, setLoanStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  // Generate particles for background animation
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3
  }));

  // Clear hospital verification when name/location changes
  useEffect(() => {
    if (hospitalName || hospitalLocation) {
      setHospitalVerificationResult(null);
    }
  }, [hospitalName, hospitalLocation]);

  // Generate loan summary when reaching the summary step
  useEffect(() => {
    if (currentStep === 'summary' && !loanSummary && !isGeneratingSummary) {
      generateLoanSummary();
    }
  }, [currentStep]);

  const generateLoanSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      // Prepare the data for the API call
      const requestData = {
        applicantDetails: {
          name: aadhaarInfo?.name || 'Not provided',
          dob: aadhaarInfo?.dateOfBirth || 'Not provided',
          gender: aadhaarInfo?.gender || 'Not provided',
          aadhaarNumber: aadhaarInfo?.aadhaarNumber || 'Not provided',
          verificationStatus: verificationResult?.isAuthentic ? 'Verified' : 'Not Verified'
        },
        hospitalDetails: {
          name: hospitalName,
          location: hospitalLocation,
          verificationStatus: hospitalVerificationResult?.exists ? 'Verified' : 'Not Verified',
          confidence: hospitalVerificationResult?.confidence
        },
        patientDetails: {
          name: emergencyFormData.patientName,
          emergencyType: emergencyFormData.emergencyType,
          emergencyDescription: emergencyFormData.emergencyDescription,
          contactNumber: emergencyFormData.contactNumber,
          relationship: emergencyFormData.relationshipToPatient
        },
        medicalCertificate: ocrResult ? {
          fileName: emergencyFormData.medicalCertificate?.name || 'Unknown',
          hasText: ocrResult.success,
          extractedText: ocrResult.text,
          confidence: ocrResult.confidence,
          textLength: ocrResult.text?.length
        } : undefined
      };

      // Call the API route instead of directly using Groq
      const response = await fetch('Emergency/Emergency_API/generate-loan-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Create structured summary data
      const summaryData = {
        applicantDetails: requestData.applicantDetails,
        hospitalDetails: requestData.hospitalDetails,
        patientDetails: requestData.patientDetails,
        medicalCertificate: requestData.medicalCertificate,
        timestamp: new Date().toISOString(),
        loanStatus: 'Pending',
        aiSummary: data.summary
      };

      setLoanSummary(summaryData);
    } catch (error: any) {
      console.error('Error generating loan summary:', error);
      setSummaryError(error.message || 'Failed to generate loan summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const approveLoan = async () => {
    try {
      // In a real app, you would call your backend API here
      setLoanStatus('approved');
      setReferenceNumber(`EMG-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error approving loan:', error);
    }
  };

  const rejectLoan = async () => {
    try {
      // In a real app, you would call your backend API here
      setLoanStatus('rejected');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error rejecting loan:', error);
    }
  };

  const clearHospitalForm = () => {
    setHospitalName('');
    setHospitalLocation('');
    setHospitalVerificationResult(null);
  };

  const verifyHospitalStrict = async (name: string, location: string) => {
    try {
      const result = await hospitalVerificationService.verifyHospital(name, location);
      setHospitalVerificationResult(result);
      return result;
    } catch (error) {
      console.error('Error verifying hospital:', error);
      throw error;
    }
  };

  const resetApplication = () => {
    setLoanStatus('pending');
    setCurrentStep('aadhaar');
    setAadhaarInfo(null);
    setVerificationResult(null);
    setHospitalName('');
    setHospitalLocation('');
    setHospitalVerificationResult(null);
    setEmergencyFormData({
      patientName: '',
      emergencyType: '',
      emergencyDescription: '',
      contactNumber: '',
      relationshipToPatient: '',
    loanAmountRequired: ''
    });
    setOcrResult(null);
    setLoanSummary(null);
    setReferenceNumber(null);
  };

  // Step navigation handler
  const handleStepClick = (step: StepType) => {
    setCurrentStep(step);
  };

  // Check if step is accessible
  const isStepAccessible = (step: StepType) => {
    switch (step) {
      case 'aadhaar':
        return true;
      case 'hospital':
        return aadhaarInfo && verificationResult?.isAuthentic;
      case 'emergency':
        return hospitalVerificationResult?.exists;
      case 'summary':
        return emergencyFormData.patientName && emergencyFormData.emergencyType;
      default:
        return false;
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }
    }),
    hover: {
      scale: 1.03,
      y: -10,
      boxShadow: "0 25px 35px -5px rgba(50, 205, 50, 0.25)",
      transition: { type: "spring", stiffness: 300 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  // Enhanced slide animations for step transitions
  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.55, 0.085, 0.68, 0.53],
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fff8] to-[#f0fff0] relative overflow-hidden">
      {/* Header Section with Samadhan Logo */}
      <motion.div 
        className="relative h-[300px] w-full bg-gradient-to-br from-[#7FFF00] via-[#32CD32] to-[#9AFF9A] overflow-hidden"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute bg-white/20 rounded-full backdrop-blur-sm"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                rotate: [0, 180, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 4 + particle.id * 0.1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="relative z-10 h-full flex flex-col px-8 py-8">
          <motion.nav 
            className="flex items-center justify-between w-full"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center gap-4"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Samadhan Logo */}
              <motion.div 
                className="w-14 h-14 bg-[#1a2332] rounded-2xl flex items-center justify-center shadow-2xl"
                whileHover={{ 
                  rotate: [0, -5, 5, 0],
                  boxShadow: "0 10px 30px rgba(26, 35, 50, 0.3)"
                }}
                transition={{ duration: 0.4 }}
              >
                <div className="relative">
                  <motion.div 
                    className="text-xl font-bold text-white"
                    animate={{ 
                      textShadow: [
                        "0 0 0px #7FFF00", 
                        "0 0 8px #7FFF00", 
                        "0 0 0px #7FFF00"
                      ] 
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    S
                  </motion.div>
                  <motion.div 
                    className="absolute -right-1 top-1 w-2 h-2 bg-[#7FFF00] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div 
                    className="absolute -right-1 top-3 w-2 h-2 bg-[#32CD32] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  />
                  <motion.div 
                    className="absolute -right-1 top-5 w-2 h-2 bg-[#9AFF9A] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
              </motion.div>
              <div>
                <motion.div 
                  className="text-2xl font-bold text-[#1a2332]"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  SAMADHAN
                </motion.div>
                <motion.div 
                  className="text-[#1a2332]/80 font-medium text-sm"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Emergency Medical Loan
                </motion.div>
              </div>
            </motion.div>
          </motion.nav>

          {/* Hero Content */}
          <motion.div 
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-center text-[#1a2332]"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(26, 35, 50, 0.3)", 
                  "0 3px 6px rgba(26, 35, 50, 0.3)", 
                  "0 0 0px rgba(26, 35, 50, 0.3)"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              Emergency Medical Loan Application
            </motion.h1>
          </motion.div>
        </div>

        {/* Enhanced gradient overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-[#1a2332]/20 via-transparent to-[#1a2332]/10 z-0"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </motion.div>

      {/* Success/Error Modals */}
      <AnimatePresence>
        {loanStatus === 'approved' && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div 
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="w-12 h-12 text-green-600" />
              </motion.div>
              <motion.h3 
                className="text-2xl font-bold text-gray-900 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Loan Approved!
              </motion.h3>
              <motion.p 
                className="text-gray-600 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Your emergency medical loan has been approved. Reference number:
              </motion.p>
              <motion.div 
                className="bg-green-50 border border-green-200 rounded-xl py-4 px-6 mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <p className="text-green-800 font-mono font-bold text-xl">{referenceNumber}</p>
              </motion.div>
              <motion.button
                onClick={resetApplication}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start New Application
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {loanStatus === 'rejected' && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div 
                className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <XCircle className="w-12 h-12 text-red-600" />
              </motion.div>
              <motion.h3 
                className="text-2xl font-bold text-gray-900 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Loan Rejected
              </motion.h3>
              <motion.p 
                className="text-gray-600 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                We're sorry, your emergency medical loan application could not be approved at this time.
              </motion.p>
              <motion.div 
                className="flex gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  onClick={() => setLoanStatus('pending')}
                  className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold border border-gray-200"
                  whileHover={{ scale: 1.02, backgroundColor: '#f3f4f6' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Review Application
                </motion.button>
                <motion.button
                  onClick={resetApplication}
                  className="flex-1 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] text-[#1a2332] py-3 rounded-xl font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Over
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Step Progress Indicator with Clickable Navigation */}
      <motion.div 
        className="container mx-auto px-4 py-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full -z-10">
              <motion.div
                className="h-full bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-full"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ 
                  scaleX: 
                    currentStep === 'aadhaar' ? 0 : 
                    currentStep === 'hospital' ? 0.33 : 
                    currentStep === 'emergency' ? 0.66 : 1 
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </div>
            
            {['aadhaar', 'hospital', 'emergency', 'summary'].map((step, index) => {
              const stepType = step as StepType;
              const isActive = currentStep === stepType;
              const isAccessible = isStepAccessible(stepType);
              const isCompleted = 
                (stepType === 'aadhaar' && verificationResult?.isAuthentic) ||
                (stepType === 'hospital' && hospitalVerificationResult?.exists) ||
                (stepType === 'emergency' && emergencyFormData.patientName);

              return (
                <motion.div
                  key={step}
                  className={`flex flex-col items-center cursor-pointer ${
                    isActive ? 'text-[#1a2332]' : 
                    isAccessible ? 'text-gray-600' : 'text-gray-400'
                  }`}
                  onClick={() => isAccessible && handleStepClick(stepType)}
                  whileHover={isAccessible ? { scale: 1.05, y: -2 } : {}}
                  whileTap={isAccessible ? { scale: 0.95 } : {}}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 font-bold text-lg border-2 transition-all duration-300 ${
                      isActive ? 
                        'bg-gradient-to-r from-[#7FFF00] to-[#32CD32] text-[#1a2332] border-[#32CD32] shadow-lg' : 
                      isCompleted ?
                        'bg-green-100 text-green-600 border-green-300' :
                      isAccessible ?
                        'bg-white text-gray-600 border-gray-300 hover:border-[#32CD32] hover:shadow-md' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                    animate={isActive ? {
                      boxShadow: [
                        "0 0 0 0 rgba(50, 205, 50, 0.4)",
                        "0 0 0 10px rgba(50, 205, 50, 0)",
                        "0 0 0 0 rgba(50, 205, 50, 0.4)"
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </motion.div>
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <motion.span 
                    className="text-sm font-medium capitalize"
                    animate={isActive ? { fontWeight: 600 } : { fontWeight: 500 }}
                  >
                    {step}
                  </motion.span>
                  {isActive && (
                    <motion.div
                      className="w-2 h-2 bg-[#32CD32] rounded-full mt-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Current Step Content with Enhanced Animations */}
      <div className="container mx-auto px-4 pb-16">
        <AnimatePresence mode="wait" custom={1}>
          {currentStep === 'aadhaar' && (
            <motion.div
              key="aadhaar"
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <AadhaarVerify
                setCurrentStep={setCurrentStep}
                setAadhaarInfo={setAadhaarInfo}
                setVerificationResult={setVerificationResult}
                aadhaarInfo={aadhaarInfo}
                verificationResult={verificationResult}
              />
            </motion.div>
          )}

          {currentStep === 'hospital' && (
            <motion.div
              key="hospital"
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <HospitalVerify
                hospitalName={hospitalName}
                setHospitalName={setHospitalName}
                hospitalLocation={hospitalLocation}
                setHospitalLocation={setHospitalLocation}
                isLoading={false}
                setIsLoading={() => {}}
                hospitalVerificationResult={hospitalVerificationResult}
                setHospitalVerificationResult={setHospitalVerificationResult}
                error={null}
                setError={() => {}}
                setCurrentStep={setCurrentStep}
                clearForm={clearHospitalForm}
                verifyHospitalStrict={verifyHospitalStrict}
              />
            </motion.div>
          )}

          {currentStep === 'emergency' && (
            <motion.div
              key="emergency"
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Form
                emergencyFormData={emergencyFormData}
                setEmergencyFormData={setEmergencyFormData}
                setCurrentStep={setCurrentStep}
                hospitalVerificationResult={hospitalVerificationResult}
                hospitalName={hospitalName}
                hospitalLocation={hospitalLocation}
                setOcrResult={setOcrResult}
                aadhaarInfo={aadhaarInfo}
                certificateAnalysis={ocrResult}
              />
            </motion.div>
          )}

          {currentStep === 'summary' && (
            <motion.div
              key="summary"
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Summary
                loanSummary={loanSummary}
                isGeneratingSummary={isGeneratingSummary}
                summaryError={summaryError}
                generateLoanSummary={generateLoanSummary}
                setCurrentStep={setCurrentStep}
                approveLoan={approveLoan}
                rejectLoan={rejectLoan}
                medicalCertificateFile={emergencyFormData.medicalCertificate}
                ocrResult={ocrResult || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Footer */}
      <motion.footer 
        className="bg-[#1a2332] py-12 relative overflow-hidden"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {/* Footer background animation */}
        <div className="absolute inset-0">
          {Array.from({ length: 15 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute bg-[#7FFF00]/5 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: Math.random() * 40 + 20,
                height: Math.random() * 40 + 20,
              }}
              animate={{
                y: [-20, 20, -20],
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 8 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-8 text-center relative z-10">
          <motion.div 
            className="flex items-center justify-center gap-4 mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="w-12 h-12 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-xl flex items-center justify-center"
              whileHover={{ 
                rotate: [0, -10, 10, 0],
                scale: 1.1,
                boxShadow: "0 0 20px rgba(127, 255, 0, 0.3)"
              }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <motion.div 
                  className="text-lg font-bold text-[#1a2332]"
                  animate={{ 
                    textShadow: [
                      "0 0 0px rgba(26, 35, 50, 0.5)",
                      "0 2px 4px rgba(26, 35, 50, 0.5)",
                      "0 0 0px rgba(26, 35, 50, 0.5)"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  S
                </motion.div>
                <motion.div 
                  className="absolute -right-0.5 top-0.5 w-1.5 h-1.5 bg-[#1a2332] rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>
            <motion.div 
              className="text-2xl font-bold text-white"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              viewport={{ once: true }}
            >
              SAMADHAN
            </motion.div>
          </motion.div>
          
          <motion.p 
            className="text-gray-400 mb-6"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Emergency Medical Loan Application System
          </motion.p>
          
          <motion.div
            className="flex justify-center space-x-8 mb-6"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            viewport={{ once: true }}
          >
            {['24/7 Support', 'Quick Approval', 'Secure Process'].map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center gap-2 text-gray-300 text-sm"
                whileHover={{ 
                  scale: 1.05, 
                  color: '#7FFF00',
                  transition: { duration: 0.2 } 
                }}
              >
                <motion.div
                  className="w-2 h-2 bg-[#32CD32] rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: index * 0.3 
                  }}
                />
                {feature}
              </motion.div>
            ))}
          </motion.div>
          
          <motion.p 
            className="text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            viewport={{ once: true }}
          >
            © {new Date().getFullYear()} Samadhan. All rights reserved.
          </motion.p>
        </div>
      </motion.footer>
    </div>
  );
}