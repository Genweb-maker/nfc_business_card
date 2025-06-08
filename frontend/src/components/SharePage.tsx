'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import { getUserProfile, addConnection } from '../lib/api';
import { showToast } from './Toast';

// Set QR Scanner worker path
QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

// Check if QR scanner has camera support
const hasCamera = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};

export default function SharePage() {
  const [profile, setProfile] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    loadProfile();
    checkNFCSupport();
    checkCameraAvailability();
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  const checkCameraAvailability = async () => {
    const isAvailable = await hasCamera();
    setCameraAvailable(isAvailable);
  };

  const loadProfile = async () => {
    try {
      const response = await getUserProfile();
      if (response.success && response.user) {
        setProfile(response.user);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('Please create your profile first', 'warning');
    }
  };

  const checkNFCSupport = () => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  };

  const generateQRCode = async () => {
    if (!profile) {
      showToast('Please create your profile first', 'warning');
      return;
    }

    try {
      const profileData = {
        type: 'profile',
        data: profile,
        timestamp: Date.now()
      };

      const qrData = JSON.stringify(profileData);
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeUrl(qrCodeDataUrl);
      showToast('QR code generated successfully!', 'success');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      showToast('Failed to generate QR code', 'error');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = 'business-card-qr.png';
    link.href = qrCodeUrl;
    link.click();
  };

  const startNFCShare = async () => {
    if (!nfcSupported) {
      showToast('NFC is not supported on this device', 'error');
      return;
    }

    if (!profile) {
      showToast('Please create your profile first', 'warning');
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      
      const profileData = {
        type: 'profile',
        data: profile,
        timestamp: Date.now()
      };

      await ndef.write({
        records: [{
          recordType: "text",
          data: JSON.stringify(profileData)
        }]
      });

      setNfcEnabled(true);
      showToast('NFC sharing enabled! Tap your device to another NFC device.', 'success');
    } catch (error: any) {
      console.error('NFC write failed:', error);
      if (error.name === 'NotAllowedError') {
        showToast('NFC permission denied', 'error');
      } else if (error.name === 'NotSupportedError') {
        showToast('NFC is not supported', 'error');
      } else {
        showToast('Failed to enable NFC sharing', 'error');
      }
    }
  };

  const readNFCTag = async () => {
    if (!nfcSupported) {
      showToast('NFC is not supported on this device', 'error');
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      
      await ndef.scan();
      showToast('Ready to read NFC tags. Bring an NFC tag close to your device.', 'info');

      ndef.addEventListener('reading', ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === 'text') {
            try {
              const textDecoder = new TextDecoder(record.encoding);
              const data = textDecoder.decode(record.data);
              const profileData = JSON.parse(data);
              
              if (profileData.type === 'profile') {
                handleReceivedProfile(profileData.data, 'nfc');
              }
            } catch (error) {
              console.error('Failed to parse NFC data:', error);
            }
          }
        }
      });
    } catch (error: any) {
      console.error('NFC read failed:', error);
      showToast('Failed to read NFC tag', 'error');
    }
  };

  const startQRScanner = async () => {
    console.log('Starting QR scanner...');
    
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported');
        showToast('Camera is not supported on this device', 'error');
        return;
      }

      // Check if running in secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.error('Not a secure context - camera access requires HTTPS');
        showToast('Camera access requires HTTPS or localhost', 'error');
        return;
      }

      setShowScanner(true);
      setScanning(true);
      console.log('Scanner modal opened');

      // Wait for the video element to be available
      setTimeout(async () => {
        if (!videoRef.current) {
          console.error('Video element not found');
          showToast('Camera element not ready', 'error');
          setScanning(false);
          setShowScanner(false);
          return;
        }

        console.log('Video element found, requesting camera access...');

        try {
          // Check camera permissions first
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          console.log('Camera access granted');
          stream.getTracks().forEach(track => track.stop()); // Stop the test stream

          console.log('Initializing QR scanner...');
          const scanner = new QrScanner(
            videoRef.current,
            (result) => {
              console.log('QR code detected:', result.data);
              try {
                const profileData = JSON.parse(result.data);
                if (profileData.type === 'profile') {
                  console.log('Valid profile QR code');
                  handleReceivedProfile(profileData.data, 'qr');
                  stopQRScanner();
                } else {
                  console.log('Invalid QR code format - not a profile');
                  showToast('Not a valid business card QR code', 'warning');
                }
              } catch (error) {
                console.error('Failed to parse QR data:', error);
                showToast('Invalid QR code format', 'error');
              }
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: 'environment',
              maxScansPerSecond: 5,
            }
          );

          scannerRef.current = scanner;
          console.log('Starting QR scanner...');
          await scanner.start();
          console.log('QR scanner started successfully');
          showToast('QR scanner started. Point camera at QR code.', 'info');
        } catch (cameraError: any) {
          console.error('Camera access failed:', cameraError);
          setScanning(false);
          setShowScanner(false);
          
          if (cameraError.name === 'NotAllowedError') {
            showToast('Camera permission denied. Please allow camera access.', 'error');
          } else if (cameraError.name === 'NotFoundError') {
            showToast('No camera found on this device', 'error');
          } else if (cameraError.name === 'NotReadableError') {
            showToast('Camera is already in use by another application', 'error');
          } else if (cameraError.name === 'NotSupportedError') {
            showToast('Camera not supported on this device', 'error');
          } else {
            showToast(`Camera error: ${cameraError.message || 'Unknown error'}`, 'error');
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      showToast('Failed to start QR scanner', 'error');
      setScanning(false);
      setShowScanner(false);
    }
  };

  const stopQRScanner = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      
      // Stop any video streams
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      setShowScanner(false);
      setScanning(false);
      showToast('QR scanner stopped', 'info');
    } catch (error) {
      console.error('Error stopping QR scanner:', error);
      setShowScanner(false);
      setScanning(false);
    }
  };

  const handleReceivedProfile = async (receivedProfile: any, method: 'nfc' | 'qr') => {
    try {
      const connectionData = {
        profileData: receivedProfile,
        method: method,
        timestamp: Date.now()
      };

      const response = await addConnection(connectionData);
      if (response.success) {
        showToast(`Profile received via ${method.toUpperCase()}!`, 'success');
      }
    } catch (error) {
      console.error('Failed to save connection:', error);
      showToast('Failed to save received profile', 'error');
    }
  };

  return (
    <div className="container mx-auto px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Share Profile</h1>
        <p className="text-xl text-white/80">Share your business card via NFC or QR code</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* NFC Share */}
        <div className="share-method">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-white mb-2">NFC Share</h2>
            <p className="text-white/80">Tap to share with nearby devices</p>
          </div>

          <div className="space-y-4">
            <div className={`nfc-status ${nfcSupported ? 'available' : 'unavailable'}`}>
              <div className="text-xl">
                {nfcSupported ? '✅' : '❌'}
              </div>
              <span>
                {nfcSupported 
                  ? (nfcEnabled ? 'NFC sharing active' : 'NFC available') 
                  : 'NFC not supported'}
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={startNFCShare}
                className="btn-primary w-full"
                disabled={!nfcSupported || !profile}
              >
                Start NFC Share
              </button>
              
              <button
                onClick={readNFCTag}
                className="btn-secondary w-full"
                disabled={!nfcSupported}
              >
                Read NFC Tag
              </button>
            </div>
          </div>
        </div>

        {/* QR Code Share */}
        <div className="share-method">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">QR Code</h2>
            <p className="text-white/80">Scan to connect instantly</p>
          </div>

          <div className="space-y-4">
            <div className={`nfc-status ${cameraAvailable ? 'available' : 'unavailable'}`}>
              <div className="text-xl">
                {cameraAvailable ? '📷' : '❌'}
              </div>
              <span>
                {cameraAvailable ? 'Camera available' : 'Camera not available'}
              </span>
            </div>

            <div className="qr-code">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="max-w-full h-auto" />
              ) : (
                <div className="qr-placeholder">
                  <div className="text-6xl text-gray-400 mb-4">📊</div>
                  <p className="text-gray-500">Click to generate QR code</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={generateQRCode}
                className="btn-primary w-full"
                disabled={!profile}
              >
                Generate QR Code
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startQRScanner}
                  className="btn-secondary"
                  disabled={scanning || !cameraAvailable}
                  title={!cameraAvailable ? 'Camera not available' : 'Click to scan QR code'}
                >
                  {scanning ? 'Scanning...' : 'Scan QR Code'}
                </button>
                
                {qrCodeUrl && (
                  <button
                    onClick={downloadQRCode}
                    className="btn-secondary"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="modal active">
          <div className="modal-content max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Scan QR Code</h2>
              <button
                onClick={stopQRScanner}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-600">Point your camera at a QR code</p>
                <button
                  onClick={stopQRScanner}
                  className="btn-secondary mt-4"
                >
                  Stop Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 