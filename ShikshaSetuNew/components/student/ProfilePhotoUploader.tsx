import React, { useState } from "react";
import { View, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto, updateStudentProfile } from "../../src/repositories/studentRepository";

interface ProfilePhotoUploaderProps {
  studentId: string;
  userId: string;
  currentPhotoUrl: string | null;
  onUploadSuccess: (newUrl: string) => void;
}

export default function ProfilePhotoUploader({
  studentId,
  userId,
  currentPhotoUrl,
  onUploadSuccess,
}: ProfilePhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImagePick = async () => {
    if (isUploading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to update profile photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      const fileUri = selectedAsset.uri;
      const mimeType = selectedAsset.mimeType || 'image/jpeg';

      setIsUploading(true);

      // 1. uploadProfilePhoto() -> returns publicUrl
      const publicUrl = await uploadProfilePhoto(userId, fileUri, mimeType);
      
      // 2. updateStudentProfile() with { profile_photo_url: publicUrl }
      await updateStudentProfile(studentId, userId, { profile_photo_url: publicUrl });

      // 3. Trigger success callback to update parent state
      onUploadSuccess(publicUrl);
      
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err: any) {
      console.error("Upload failed:", err);
      Alert.alert('Upload Error', err?.message || 'Failed to upload profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="items-center mb-4 relative">
      <View className="relative">
        <View className="w-[100px] h-[100px] rounded-full border-[3px] border-[#D4AF37] overflow-hidden bg-gray-100 justify-center items-center">
          {currentPhotoUrl ? (
            <Image 
              source={{ uri: currentPhotoUrl }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={require("../../assets/profile.jpg")} 
              className="w-full h-full"
              resizeMode="cover"
            />
          )}
          
          {/* Upload Progress Indicator over photo */}
          {isUploading && (
            <View className="absolute inset-0 bg-black/40 justify-center items-center rounded-full">
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Edit Button bottom-right of photo, 28x28px */}
        <TouchableOpacity
          onPress={handleImagePick}
          disabled={isUploading}
          className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0D1B2A] items-center justify-center border-2 border-white shadow-sm ${
            isUploading ? "opacity-50" : ""
          }`}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
