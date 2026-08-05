import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from '@/lib/platform/native';

export async function captureProofPhoto(): Promise<string | null> {
  if (!isNativeApp()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
      saveToGallery: false,
    });

    return photo.dataUrl ?? null;
  } catch (err) {
    console.warn('Native camera capture cancelled or failed', err);
    return null;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;

  const perms = await Camera.requestPermissions({ permissions: ['camera'] });
  return perms.camera === 'granted' || perms.camera === 'limited';
}
