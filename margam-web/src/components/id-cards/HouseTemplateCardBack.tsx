import React from 'react';
import { HouseColor, HOUSE_COLORS } from './HouseTemplateCardFront';

type HouseTemplateCardBackProps = {
  houseName: string;
  houseColor: HouseColor;
  institutionName: string;
  logoUrl?: string | null;
  institutionAddress?: string;
  institutionPhone?: string; // from institutions.phone
  parentName?: string;
  parentPhone?: string;
  address?: string;
  bloodGroup?: string;
  qualification?: string;
  type: 'student' | 'teacher';
  width?: number;
  height?: number;
  scale?: number;
};

export default function HouseTemplateCardBack({
  houseName,
  houseColor,
  institutionName,
  logoUrl,
  institutionAddress,
  institutionPhone,
  parentName,
  parentPhone,
  address,
  bloodGroup,
  qualification,
  type,
  width = 204,
  height = 324,
  scale = 1,
}: HouseTemplateCardBackProps) {
  const colorHex = HOUSE_COLORS[houseColor] || '#333';
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  return (
    <div
      className="border border-gray-200 shadow-sm relative overflow-hidden bg-white flex flex-col justify-between select-none"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        borderRadius: `${16 * scale}px`,
        borderWidth: `${1 * scale}px`,
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Watermark Logo */}
      {logoUrl && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
          <img
            src={logoUrl}
            alt="watermark"
            crossOrigin="anonymous"
            style={{
              width: `${128 * scale}px`,
              height: `${128 * scale}px`,
            }}
            className="object-contain"
          />
        </div>
      )}

      {/* Header Band */}
      <div
        className="relative z-10 text-center flex items-center justify-center"
        style={{
          height: `${36 * scale}px`,
          backgroundColor: colorHex,
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
        }}
      >
        <span
          className="font-bold text-white tracking-wide uppercase"
          style={{ fontSize: `${9 * scale}px` }}
        >
          {houseName} House Details
        </span>
      </div>

      {/* Details List */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-center text-[8px]"
        style={{
          gap: `${5 * scale}px`,
          paddingTop: `${6 * scale}px`,
          paddingBottom: `${6 * scale}px`,
          paddingLeft: `${12 * scale}px`,
          paddingRight: `${12 * scale}px`,
        }}
      >
        {type === 'student' ? (
          <>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Blood Group</span>
              <span className="font-bold text-right ml-2 text-gray-700">{bloodGroup || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Guardian Name</span>
              <span className="font-bold text-right ml-2 text-gray-700 break-words" style={{ maxWidth: `${110 * scale}px` }}>{parentName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Guardian Phone</span>
              <span className="font-bold text-right ml-2 text-gray-700">{parentPhone || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Address</span>
              <span className="font-bold text-right ml-2 text-gray-700 break-words" style={{ maxWidth: `${110 * scale}px` }} title={address || ''}>{address || 'N/A'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Blood Group</span>
              <span className="font-bold text-right ml-2 text-gray-700">N/A</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Qualification</span>
              <span className="font-bold text-right ml-2 text-gray-700 break-words" style={{ maxWidth: `${110 * scale}px` }}>{qualification || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
              <span className="flex-shrink-0 text-gray-400 font-semibold">Address</span>
              <span className="font-bold text-right ml-2 text-gray-700 break-words" style={{ maxWidth: `${110 * scale}px` }} title={address || ''}>{address || 'N/A'}</span>
            </div>
          </>
        )}

        {/* Institution Contact Number */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-0.5" style={{ fontSize: `${8 * scale}px`, paddingBottom: `${1.5 * scale}px`, borderBottomWidth: `${0.5 * scale}px` }}>
          <span className="flex-shrink-0 text-gray-400 font-semibold">School Contact</span>
          <span className="font-bold text-right ml-2 text-gray-700">{institutionPhone || 'N/A'}</span>
        </div>
      </div>

      {/* Signature Section */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          marginTop: `${4 * scale}px`,
          paddingBottom: `${8 * scale}px`,
        }}
      >
        <div
          className="border-t border-gray-300"
          style={{
            width: `${64 * scale}px`,
            marginBottom: `${2 * scale}px`,
            borderTopWidth: `${1 * scale}px`,
          }}
        ></div>
        <span
          className="uppercase tracking-wider font-semibold text-gray-400"
          style={{ fontSize: `${7 * scale}px` }}
        >
          Authorized Signatory
        </span>
      </div>

      {/* Bottom Thin Line */}
      <div
        className="w-full"
        style={{
          height: `${4 * scale}px`,
          backgroundColor: colorHex,
        }}
      />
    </div>
  );
}
