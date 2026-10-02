'use client'

import React, { useState } from 'react'
import { updateHouseName } from './actions'
import { House, HouseColor } from '@/lib/repositories/houses'

const HOUSE_COLOUR_MAP: Record<HouseColor, string> = {
  red:    '#DC2626',
  green:  '#16A34A',
  yellow: '#CA8A04',
  blue:   '#2563EB',
};

const HOUSE_TEMPLATE_LABEL: Record<HouseColor, string> = {
  red:    'Red · Template 5',
  green:  'Green · Template 6',
  yellow: 'Yellow · Template 7',
  blue:   'Blue · Template 8',
};

interface HousesClientProps {
  initialHouses: House[]
}

export default function HousesClient({ initialHouses }: HousesClientProps) {
  const [houses, setHouses] = useState<House[]>(initialHouses)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleStartEdit = (house: House) => {
    setEditingId(house.id)
    setEditName(house.name)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setErrorMsg(null)
  }

  const handleSave = async (houseId: string) => {
    if (!editName.trim()) {
      setErrorMsg('House name cannot be empty.')
      return
    }

    setLoadingId(houseId)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await updateHouseName(houseId, editName)
      if (res.success) {
        setHouses(prev =>
          prev.map(h => (h.id === houseId ? { ...h, name: editName.trim() } : h))
        )
        setSuccessMsg('House name updated successfully!')
        setEditingId(null)
        // Clear success message after a delay
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setErrorMsg(res.error || 'Failed to update house name.')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg('An unexpected error occurred.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6 font-body pb-12">
      {/* Header section */}
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">House Management</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Rename your institution's houses. House colours are fixed and tied to ID card templates.
        </p>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold shadow-sm animate-fade-in">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* 2x2 Houses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {houses.map((house) => {
          const isEditing = editingId === house.id
          const colorHex = HOUSE_COLOUR_MAP[house.color]
          const templateLabel = HOUSE_TEMPLATE_LABEL[house.color]

          return (
            <div
              key={house.id}
              className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex items-center gap-6 relative overflow-hidden transition-all hover:shadow-md"
            >
              {/* Decorative top accent line using house color */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: colorHex }}
              />

              {/* Large Coloured Circle Badge */}
              <div
                className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-inner"
                style={{ backgroundColor: colorHex }}
              >
                <span className="text-2xl uppercase">{house.name.slice(0, 2)}</span>
              </div>

              {/* House Info & Editing Input */}
              <div className="flex-1 space-y-1">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={loadingId === house.id}
                      className="w-full bg-cream/25 border border-light-gray focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-sm outline-none font-body text-charcoal transition-all"
                      placeholder="Enter house name"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSave(house.id)}
                        disabled={loadingId === house.id}
                        className="px-3.5 py-1.5 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {loadingId === house.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loadingId === house.id}
                        className="px-3.5 py-1.5 text-xs font-semibold text-steel-gray hover:text-primary bg-white hover:bg-cream/10 border border-light-gray rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3
                      onClick={() => handleStartEdit(house)}
                      className="text-lg font-bold text-charcoal font-heading hover:text-primary cursor-pointer hover:underline inline-flex items-center gap-2 group"
                      title="Click to rename"
                    >
                      {house.name}
                      <svg
                        className="w-4 h-4 text-steel-gray/40 group-hover:text-primary transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </h3>
                  </div>
                )}
                <div
                  className="text-xs font-bold uppercase tracking-wider mt-1"
                  style={{ color: colorHex }}
                >
                  {templateLabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
