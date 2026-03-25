'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, firebaseApp } from '@/firebase';

const storage = getStorage(firebaseApp);

/**
 * Uploads a file to Firebase Storage with progress tracking.
 * @param file The file to upload.
 * @param onProgress A callback function to report upload progress (0-100).
 * @returns A promise that resolves with the direct download URL of the uploaded file.
 */
export const uploadFile = (file: File, onProgress: (percentage: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            // This should ideally not happen if the create page is protected
            return reject(new Error('You must be logged in to upload files.'));
        }

        const fileId = `${Date.now()}-${file.name}`;
        const storagePath = `uploads/${userId}/${fileId}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(Math.round(progress));
            },
            (error) => {
                console.error("Upload failed:", error);
                switch (error.code) {
                    case 'storage/unauthorized':
                        reject(new Error('Permission denied. Please check your Firebase Storage security rules to allow writes for authenticated users.'));
                        break;
                    case 'storage/canceled':
                        // This isn't a "failure" so we don't need to show an error.
                        // The promise will just not resolve.
                        console.log('Upload was canceled.');
                        break;
                    default:
                        reject(new Error('An unknown error occurred during upload. See console for details.'));
                }
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                }).catch(reject);
            }
        );
    });
};
