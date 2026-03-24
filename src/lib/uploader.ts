'use client';

import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { uploadFile as mediaHostUpload } from '@/lib/mediahost';

// Helper function to get the media API URL from settings
const getMediaApiUrl = async (): Promise<string> => {
    const settingsRef = doc(firestore, 'config', 'appSettings');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        return settingsData.mediaApiBaseUrl || '';
    }
    return '';
};


/**
 * Uploads a file to the custom media hosting service with progress tracking.
 * @param file The file to upload.
 * @param onProgress A callback function to report upload progress (0-100).
 * @returns A promise that resolves with the direct download URL of the uploaded file.
 */
export const uploadFile = async (file: File, onProgress: (percentage: number) => void): Promise<string> => {
    const apiUrl = await getMediaApiUrl();
    if (!apiUrl) {
        throw new Error('Media upload API URL is not configured in admin settings.');
    }

    // By removing the try/catch, the original, more detailed error from mediahost.ts
    // will bubble up to the UI, which is what we want for better debugging.
    const result = await mediaHostUpload(file, {
        apiUrl: apiUrl,
        onProgress: (pct, label) => {
            onProgress(pct);
        }
    });

    if (result && result.direct_url) {
        return result.direct_url;
    } else {
        // This case should be covered by errors thrown inside mediaHostUpload, but is here for safety.
        throw new Error(result.error || 'Invalid response from upload API.');
    }
};
