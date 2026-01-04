/**
 * CropTool Component
 * 
 * Uses react-easy-crop for interactive cropping with aspect ratio controls.
 * Features:
 * - Numeric inputs for precise crop positioning (X, Y, Width, Height in %)
 * - Current aspect ratio display
 * - Cancel button to restore pre-crop image
 */

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Crop, Check, X } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { ASPECT_RATIOS, AspectRatioOption, CropArea } from '../../types';

export function CropTool() {
  const { 
    originalImage, 
    isCropping, 
    cropState,
    setIsCropping, 
    setCropState,
    applyCrop,
    cancelCrop
  } = useImageStore();

  const [tempCroppedAreaPixels, setTempCroppedAreaPixels] = useState<CropArea | null>(null);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: CropArea) => {
    setTempCroppedAreaPixels(croppedAreaPixels);
    
    // Update numeric inputs based on crop area
    if (originalImage) {
      const cropX = (croppedAreaPixels.x / originalImage.width) * 100;
      const cropY = (croppedAreaPixels.y / originalImage.height) * 100;
      const cropWidth = (croppedAreaPixels.width / originalImage.width) * 100;
      const cropHeight = (croppedAreaPixels.height / originalImage.height) * 100;
      
      setCropState({ cropX, cropY, cropWidth, cropHeight });
    }
  }, [originalImage, setCropState]);

  const handleApplyCrop = () => {
    if (tempCroppedAreaPixels) {
      applyCrop(tempCroppedAreaPixels);
    }
  };

  // Calculate current aspect ratio from crop area
  const currentAspectRatio = tempCroppedAreaPixels 
    ? (tempCroppedAreaPixels.width / tempCroppedAreaPixels.height).toFixed(2)
    : '1.00';

  if (!originalImage) return null;

  const imageUrl = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(originalImage, 0, 0);
    return canvas.toDataURL();
  })();

  if (!isCropping) {
    return (
      <button
        onClick={() => setIsCropping(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 
                   text-white rounded-lg transition-colors text-sm"
      >
        <Crop className="w-4 h-4" />
        Crop Image
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Crop controls */}
      <div className="absolute top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm p-4 z-10 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-white font-semibold">Crop Image</h3>
          
          {/* Aspect ratio buttons */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ASPECT_RATIOS) as AspectRatioOption[]).map((aspect) => (
              <button
                key={aspect}
                onClick={() => setCropState({ aspect })}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  cropState.aspect === aspect
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {aspect === 'free' ? 'Free' : aspect}
              </button>
            ))}
          </div>

          {/* Numeric crop inputs */}
          <div className="hidden lg:flex gap-2 text-xs">
            <div>
              <label className="text-gray-400">X%</label>
              <input
                type="number"
                value={cropState.cropX.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setCropState({ cropX: val });
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400">Y%</label>
              <input
                type="number"
                value={cropState.cropY.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setCropState({ cropY: val });
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400">W%</label>
              <input
                type="number"
                value={cropState.cropWidth.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && val <= 100) {
                    setCropState({ cropWidth: val });
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400">H%</label>
              <input
                type="number"
                value={cropState.cropHeight.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && val <= 100) {
                    setCropState({ cropHeight: val });
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          {/* Current aspect ratio */}
          <div className="hidden md:block text-sm text-gray-400">
            Aspect: <span className="text-white font-mono">{currentAspectRatio}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={cancelCrop}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 
                         text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 
                         text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Cropper */}
      <div className="absolute inset-0 pt-20">
        <Cropper
          image={imageUrl}
          crop={cropState.crop}
          zoom={cropState.zoom}
          rotation={cropState.rotation}
          aspect={ASPECT_RATIOS[cropState.aspect]}
          onCropChange={(crop) => setCropState({ crop })}
          onZoomChange={(zoom) => setCropState({ zoom })}
          onRotationChange={(rotation) => setCropState({ rotation })}
          onCropComplete={onCropComplete}
        />
      </div>
    </div>
  );
}
