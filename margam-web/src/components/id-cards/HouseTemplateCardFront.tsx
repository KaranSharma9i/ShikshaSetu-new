import React, { useState } from 'react';

export type HouseColor = 'red' | 'green' | 'yellow' | 'blue';

export const HOUSE_COLORS: Record<HouseColor, string> = {
  red:    '#DC2626',
  green:  '#16A34A',
  yellow: '#CA8A04',
  blue:   '#2563EB',
} as const;

// Inline component to render image with initials fallback
function CardPhoto({
  src,
  name,
  borderColor,
  scale = 1,
}: {
  src: string | null | undefined
  name: string
  borderColor: string
  scale?: number
}) {
  const [error, setError] = useState(false)

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }

  const size = 64 * scale
  const borderWidth = `${2 * scale}px`

  if (src && !error) {
    return (
      <div
        className="relative overflow-hidden shadow-sm flex-shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderWidth,
          borderStyle: 'solid',
          borderColor,
          borderRadius: '50%',
        }}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <img
          src={src}
          alt={name}
          onError={() => setError(true)}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0"
      style={{
        backgroundColor: borderColor,
        width: `${size}px`,
        height: `${size}px`,
        borderWidth,
        borderStyle: 'solid',
        borderColor,
        borderRadius: '50%',
        fontSize: `${14 * scale}px`,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

type HouseTemplateCardFrontProps = {
  name: string;
  photoUrl?: string | null;
  idCode: string;
  rollNo?: string;
  classSection?: string;
  designation?: string;
  dob?: string;
  bloodGroup?: string;
  phone?: string;
  houseName: string;
  houseColor: HouseColor;
  institutionName: string;
  logoUrl?: string | null;
  width?: number;
  height?: number;
  scale?: number;
  type: 'student' | 'teacher';
};

export default function HouseTemplateCardFront({
  name,
  photoUrl,
  idCode,
  rollNo,
  classSection,
  designation,
  dob,
  bloodGroup,
  phone,
  houseName,
  houseColor,
  institutionName,
  logoUrl,
  width = 204,
  height = 324,
  scale = 1,
  type,
}: HouseTemplateCardFrontProps) {
  const colorHex = HOUSE_COLORS[houseColor] || '#333';
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

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
      {/* Wavy/Diagonal Split top header background */}
      <div
        className="absolute top-0 left-0 w-full z-0"
        style={{
          height: `${110 * scale}px`,
          backgroundColor: colorHex,
          clipPath: 'polygon(0 0, 100% 0, 100% 65%, 0 90%)',
        }}
      />

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

      {/* Header Content */}
      <div
        className="relative z-10 flex items-center justify-between"
        style={{
          paddingTop: `${10 * scale}px`,
          paddingLeft: `${10 * scale}px`,
          paddingRight: `${10 * scale}px`,
        }}
      >
        {/* School Logo & Name */}
        <div className="flex items-center" style={{ gap: `${4 * scale}px` }}>
          {logoUrl ? (
            <div
              className="flex items-center justify-center rounded bg-white overflow-hidden shadow-sm"
              style={{
                width: `${20 * scale}px`,
                height: `${20 * scale}px`,
                padding: `${1.5 * scale}px`,
              }}
            >
              <img
                src={logoUrl}
                alt={institutionName}
                crossOrigin="anonymous"
                className="max-w-full max-h-full w-auto h-auto"
              />
            </div>
          ) : (
            <div
              className="rounded flex items-center justify-center font-bold bg-white"
              style={{
                color: colorHex,
                width: `${18 * scale}px`,
                height: `${18 * scale}px`,
                fontSize: `${8 * scale}px`,
              }}
            >
              {getInitials(institutionName)}
            </div>
          )}
          <span
            className="font-bold tracking-tight text-white truncate"
            style={{
              fontSize: `${9 * scale}px`,
              maxWidth: `${90 * scale}px`,
            }}
          >
            {institutionName}
          </span>
        </div>

        {/* House Tag */}
        <span
          className="font-black uppercase tracking-wider rounded-full bg-white shadow-sm"
          style={{
            fontSize: `${7 * scale}px`,
            paddingLeft: `${6 * scale}px`,
            paddingRight: `${6 * scale}px`,
            paddingTop: `${1.5 * scale}px`,
            paddingBottom: `${1.5 * scale}px`,
            color: colorHex,
          }}
        >
          {houseName}
        </span>
      </div>

      {/* Profile Photo Area (Centered & Overlapping Split) */}
      <div
        className="relative z-10 flex flex-col items-center flex-1 justify-center"
        style={{ marginTop: `${15 * scale}px` }}
      >
        <div className="relative">
          <CardPhoto
            src={photoUrl}
            name={name}
            borderColor={colorHex}
            scale={scale}
          />
          {/* Student/Staff pill below photo */}
          <span
            className="absolute left-1/2 transform -translate-x-1/2 font-black uppercase tracking-wider rounded-full leading-none shadow-sm text-white"
            style={{
              bottom: `${-8 * scale}px`,
              fontSize: `${7 * scale}px`,
              paddingLeft: `${8 * scale}px`,
              paddingRight: `${8 * scale}px`,
              paddingTop: `${2.5 * scale}px`,
              paddingBottom: `${2.5 * scale}px`,
              backgroundColor: colorHex,
            }}
          >
            {type === 'student' ? 'Student' : 'Staff'}
          </span>
        </div>

        {/* Basic Details */}
        <div
          className="text-center w-full"
          style={{
            marginTop: `${14 * scale}px`,
            paddingLeft: `${8 * scale}px`,
            paddingRight: `${8 * scale}px`,
          }}
        >
          <h3
            className="font-bold break-words line-clamp-2 leading-tight"
            style={{
              color: '#333333',
              fontFamily: 'var(--font-heading)',
              fontSize: `${12 * scale}px`,
            }}
          >
            {name}
          </h3>
          <p
            className="font-semibold leading-normal break-words line-clamp-1"
            style={{
              color: colorHex,
              fontSize: `${9 * scale}px`,
              marginTop: `${3 * scale}px`,
            }}
          >
            {type === 'student' ? classSection : designation}
          </p>
        </div>
      </div>

      {/* Details Footer Grid */}
      <div
        className="relative z-10 border-t border-gray-100 grid grid-cols-2 text-[8px] bg-gray-50/50"
        style={{
          paddingTop: `${6 * scale}px`,
          paddingBottom: `${10 * scale}px`,
          paddingLeft: `${10 * scale}px`,
          paddingRight: `${10 * scale}px`,
          gap: `${4 * scale}px`,
          fontSize: `${8 * scale}px`,
          marginTop: `${6 * scale}px`,
          borderTopWidth: `${1 * scale}px`,
        }}
      >
        <div>
          <span className="block uppercase tracking-wider text-gray-400 font-semibold" style={{ fontSize: `${7 * scale}px` }}>ID No</span>
          <span className="block font-bold truncate text-gray-700" style={{ fontSize: `${8 * scale}px` }}>{idCode || 'N/A'}</span>
        </div>
        <div>
          <span className="block uppercase tracking-wider text-gray-400 font-semibold" style={{ fontSize: `${7 * scale}px` }}>
            {type === 'student' ? 'DOB' : 'Joined'}
          </span>
          <span className="block font-bold truncate text-gray-700" style={{ fontSize: `${8 * scale}px` }}>{dob || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
