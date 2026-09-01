import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLivelinessDetection } from '@/app/FaceAuth/Face_API/LivelinessDetection';
import EnhancedFaceApiService from '@/app/FaceAuth/Face_API/FaceApiService';
import "@/app/styles/authentication.css";

interface AuthenticationPanelProps {
  loginUsername: string;
  setLoginUsername: (username: string) => void;
  authenticateUser: () => Promise<boolean>;
  isAuthenticating: boolean;
  isCallingUser: boolean;
  resetRegistration: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onAuthenticationComplete?: () => void;
}

const AuthenticationPanel: React.FC<AuthenticationPanelProps> = ({
  loginUsername,
  setLoginUsername,
  authenticateUser,
  isAuthenticating,
  isCallingUser,
  resetRegistration,
  videoRef,
  onAuthenticationComplete
}) => {
  // Simplified authentication states
  const [authenticationStep, setAuthenticationStep] = useState<
    'idle' | 'preparing' | 'scanning' | 'liveness_check' | 'processing' | 'complete' | 'failed'
  >('idle');
  
  // Essential states only
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authProgress, setAuthProgress] = useState(0);
  const [faceMatchDistance, setFaceMatchDistance] = useState<number | null>(null);
  
  // Timers
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize liveness detection
  const { 
    isDetecting, 
    timeRemaining, 
    startDetection, 
    stopDetection 
  } = useLivelinessDetection({
    timeLimit: 6,
    marThreshold: 0.20,
    detectionInterval: 200,
    requiredFrames: 2,
    smileConfidence: 0.5
  });

  // Simple face detection - just for indicator
  const performFaceDetection = useCallback(async () => {
    if (!videoRef.current || !EnhancedFaceApiService.areModelsLoaded()) return;
    
    try {
      const video = videoRef.current;
      if (video.paused || video.ended || !video.srcObject) return;

      const faceapi = (window as any).faceapi;
      const detectOptions = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320,
        scoreThreshold: 0.3
      });
      
      const result = await faceapi
        .detectSingleFace(video, detectOptions)
        .withFaceLandmarks();
      
      setIsFaceDetected(!!result);
    } catch (error) {
      console.error('Face detection error:', error);
      setIsFaceDetected(false);
    }
  }, [videoRef]);

  // Streamlined authentication flow
  const startAuthentication = async () => {
    try {
      setAuthError(null);
      setAuthProgress(0);
      setFaceMatchDistance(null);
      setAuthenticationStep('preparing');
      
      // Quick model check
      if (!EnhancedFaceApiService.areModelsLoaded()) {
        await EnhancedFaceApiService.loadModels();
      }
      setAuthProgress(20);
      
      // Very brief scanning phase
      setAuthenticationStep('scanning');
      await new Promise(resolve => setTimeout(resolve, 500));
      setAuthProgress(40);
      
      // Quick liveness check
      setAuthenticationStep('liveness_check');
      if (videoRef.current) {
        const livenessResult = await startDetection(videoRef.current);
        if (!livenessResult) {
          throw new Error("Please look at the camera and smile naturally");
        }
      }
      setAuthProgress(70);
      
      // Face authentication
      setAuthenticationStep('processing');
      const faceAuthResult = await authenticateUser();
      
      // Simplified validation
      if (faceMatchDistance !== null && faceMatchDistance > 0.55) {
        throw new Error(`Authentication failed - please try again`);
      } else if (!faceAuthResult) {
        throw new Error("Authentication failed - please try again");
      }
      
      setAuthProgress(100);
      
      // Complete
      setAuthenticationStep('complete');
      console.log("🎉 Authentication successful!");
      
      // Quick completion
      if (onAuthenticationComplete) {
        setTimeout(onAuthenticationComplete, 1000);
      }
      
    } catch (error: any) {
      console.error("Authentication failed:", error);
      setAuthError(error.message);
      setAuthenticationStep('failed');
      setAuthProgress(0);
      stopDetection();
    }
  };

  // Reset function
  const handleRetry = () => {
    setAuthenticationStep('idle');
    setAuthError(null);
    setAuthProgress(0);
    setFaceMatchDistance(null);
    stopDetection();
  };

  // Complete reset
  const handleCompleteReset = () => {
    handleRetry();
    resetRegistration();
  };

  // Face detection interval
  useEffect(() => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    
    detectionInterval.current = setInterval(performFaceDetection, 500);
    
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };
  }, [performFaceDetection]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };
  }, []);

  const getStatusColor = () => {
    if (authenticationStep === 'complete') return '#00ff88';
    if (authenticationStep === 'failed') return '#ff4444';
    if (authenticationStep === 'processing' || authenticationStep === 'scanning' || authenticationStep === 'liveness_check') return '#ffaa00';
    return '#4A90E2';
  };

  const getMainMessage = () => {
    switch (authenticationStep) {
      case 'preparing': return '⚡ Getting ready...';
      case 'scanning': return '📸 Capturing image...';
      case 'liveness_check': return '😊 Please perform some gestures';
      case 'processing': return '🔐 Verifying...';
      case 'complete': return '🎉 Welcome! Authentication successful';
      case 'failed': return '❌ Authentication failed';
      default: 
        return '🛡️ Ready for Face Authentication';
    }
  };

  const getButtonText = (): string => {
    switch (authenticationStep) {
      case 'preparing': return 'Preparing...';
      case 'scanning': return 'Scanning...';
      case 'liveness_check': return 'Processing...';
      case 'processing': return 'Verifying...';
      case 'complete': return 'Success!';
      case 'failed': return 'Try Again';
      default: 
        return 'Start Authentication';
    }
  };

  const isButtonDisabled = () => {
    return (
      authenticationStep !== 'idle' && 
      authenticationStep !== 'failed'
    ) || 
    isAuthenticating || 
    isCallingUser ||
    !loginUsername;
  };

  return (
    <div className="authentication-panel smooth-ux">
      <div className="panel-header">
        <h2 className="panel-title">🛡️ Quick Face Authentication</h2>
        
        {/* Progress indicator */}
        {authProgress > 0 && (
          <div className="progress-container smooth">
            <div className="progress-bar">
              <div 
                className="progress-fill smooth" 
                style={{ 
                  width: `${authProgress}%`,
                  backgroundColor: getStatusColor()
                }}
              ></div>
            </div>
            <span className="progress-text">{authProgress}%</span>
          </div>
        )}
      </div>
      
      {/* Username input */}
      <div className="form-group">
        <label htmlFor="loginUsername" className="input-label">Face ID</label>
        <input
          type="text"
          id="loginUsername"
          placeholder="Enter your Face ID"
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
          className="text-input smooth"
          disabled={authenticationStep !== 'idle' && authenticationStep !== 'failed'}
        />
      </div>
      
      {/* Main status message */}
      <div className="status-message" style={{ color: getStatusColor() }}>
        <h3>{getMainMessage()}</h3>
        
        {/* Show liveness detection timer */}
        {authenticationStep === 'liveness_check' && isDetecting && (
          <div className="liveness-timer">
            <span>⏱️ {timeRemaining}s</span>
          </div>
        )}
      </div>
      
      {/* Video container */}
      <div className="video-container smooth">
        <video
          id="video"
          width="640"
          height="480"
          autoPlay
          muted
          ref={videoRef}
          className="video-element smooth"
        />
        
        {/* Simple face detection indicator */}
        {isFaceDetected && (
          <div className={`detection-indicator ${
            authenticationStep === 'scanning' ? 'scanning' :
            authenticationStep === 'liveness_check' ? 'liveness' :
            authenticationStep === 'processing' ? 'processing' :
            authenticationStep === 'complete' ? 'success' : 'detected'
          }`}>
            <div className="detection-ring">
              <div className="ring-inner"></div>
            </div>
          </div>
        )}
        
        {/* Security watermark */}
        <div className="security-watermark">
          <div className="watermark-text">SECURE AUTH</div>
          <div className="watermark-timestamp">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>
      
      {/* Error display */}
      {authError && (
        <div className="error-container smooth">
          <div className="error-header">
            <div className="error-icon">⚠️</div>
            <h4>Try Again</h4>
          </div>
          <div className="error-message">{authError}</div>
        </div>
      )}
      
      {/* MAIN AUTHENTICATION BUTTON - Always visible and clickable when ready */}
      <div className="main-auth-section">
        <button
          onClick={authenticationStep === 'failed' ? handleRetry : startAuthentication}
          disabled={isButtonDisabled()}
          className={`main-auth-button ${
            authenticationStep === 'complete' ? 'success' :
            authenticationStep === 'failed' ? 'retry' :
            authenticationStep !== 'idle' ? 'processing' :
            !loginUsername ? 'disabled' : 'ready'
          }`}
        >
          <div className="button-content">
            <span className="btn-icon">
              {authenticationStep === 'complete' ? '✓' : 
               authenticationStep === 'failed' ? '🔄' :
               authenticationStep !== 'idle' ? '⚡' : '🚀'}
            </span>
            <span className="btn-text">{getButtonText()}</span>
          </div>
          {!loginUsername && (
            <div className="button-hint">Enter Face ID first</div>
          )}
        </button>
      </div>
      
      {/* Secondary actions */}
      <div className="secondary-actions">
        <button 
          onClick={handleCompleteReset}
          className="reset-button"
          disabled={authenticationStep === 'processing'}
        >
          <span className="btn-icon">🔄</span>
          <span className="btn-text">Reset</span>
        </button>
      </div>
      
      {/* Simple status indicators */}
      
    </div>
  );
};

export default AuthenticationPanel;