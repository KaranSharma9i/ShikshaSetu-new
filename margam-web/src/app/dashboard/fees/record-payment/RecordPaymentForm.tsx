'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getStudentFeesAction, recordPaymentAction } from '../actions'
import { StudentListItem } from '@/lib/repositories/student'

interface RecordPaymentFormProps {
  institutionId: string
  students: StudentListItem[]
  preselectedStudentId?: string
  preselectedStudentFees?: any
}

export default function RecordPaymentForm({
  institutionId,
  students,
  preselectedStudentId = '',
  preselectedStudentFees = null,
}: RecordPaymentFormProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId)
  const [studentSearch, setStudentSearch] = useState<string>(
    preselectedStudentId
      ? students.find((s) => s.id === preselectedStudentId)?.full_name || ''
      : ''
  )
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const [feesData, setFeesData] = useState<any>(preselectedStudentFees)
  const [isLoadingFees, setIsLoadingFees] = useState<boolean>(false)

  // Form inputs
  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState<string>('')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')
  const [notes, setNotes] = useState<string>('')

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null)

  const handleStudentSelect = async (student: StudentListItem) => {
    setSelectedStudentId(student.id)
    setStudentSearch(student.full_name)
    setShowDropdown(false)
    setIsLoadingFees(true)
    setErrorMsg(null)

    try {
      const res = await getStudentFeesAction(student.id)
      if (res.success && res.data) {
        setFeesData(res.data)
        // Reset selected fee structure
        setSelectedFeeStructureId('')
        setAmountPaid('')
      } else {
        setErrorMsg(res.error || 'Failed to load student fees.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('An error occurred loading fees.')
    } finally {
      setIsLoadingFees(false)
    }
  }

  const handleStructureSelect = (structId: string, pendingAmount: number) => {
    setSelectedFeeStructureId(structId)
    setAmountPaid(pendingAmount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) {
      setErrorMsg('Please select a student.')
      return
    }
    if (!selectedFeeStructureId) {
      setErrorMsg('Please select a fee structure.')
      return
    }

    const amt = parseFloat(amountPaid)
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount greater than zero.')
      return
    }

    const selectedStruct = feesData?.fees?.find((f: any) => f.id === selectedFeeStructureId)
    if (selectedStruct && amt > selectedStruct.pending_amount + 0.01) {
      setErrorMsg(`Payment amount exceeds outstanding dues of ₹${selectedStruct.pending_amount.toLocaleString('en-IN')}.`)
      return
    }

    setErrorMsg(null)

    startTransition(async () => {
      const res = await recordPaymentAction(institutionId, {
        studentId: selectedStudentId,
        feeStructureId: selectedFeeStructureId,
        amountPaid: amt,
        paymentMethod,
        notes: notes.trim() || null,
      })

      if (res.success && res.paymentId) {
        const student = students.find((s) => s.id === selectedStudentId)
        const feeStruct = feesData?.fees?.find((f: any) => f.id === selectedFeeStructureId)

        // Set success receipt details
        setSuccessReceipt({
          receiptNo: res.paymentId.substring(0, 8).toUpperCase(),
          date: new Date().toISOString(),
          studentName: student?.full_name || 'Student',
          studentCode: student?.student_code || '',
          className: student?.class_name || '',
          sectionName: student?.section_name || '',
          feeName: feeStruct?.fee_name || 'School Fee',
          amountPaid: amt,
          paymentMethod,
          notes: notes.trim(),
          remaining: Math.max(0, (feeStruct?.pending_amount || 0) - amt),
        })

        // Reload student fees
        const updatedFees = await getStudentFeesAction(selectedStudentId)
        if (updatedFees.success) {
          setFeesData(updatedFees.data)
        }
        
        // Clear inputs
        setSelectedFeeStructureId('')
        setAmountPaid('')
        setNotes('')
      } else {
        setErrorMsg(res.error || 'Failed to record payment.')
      }
    })
  }

  const handleReset = () => {
    setSuccessReceipt(null)
    setErrorMsg(null)
    // If not preselected, clear selection
    if (!preselectedStudentId) {
      setSelectedStudentId('')
      setStudentSearch('')
      setFeesData(null)
    } else {
      // Refresh current preselected student
      handleStudentSelect(students.find((s) => s.id === preselectedStudentId)!)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Filter students based on autocomplete input
  const filteredStudents = students.filter((s) => {
    const searchLower = studentSearch.toLowerCase()
    return (
      s.full_name.toLowerCase().includes(searchLower) ||
      s.student_code.toLowerCase().includes(searchLower) ||
      s.class_name.toLowerCase().includes(searchLower)
    )
  })

  // Format currency helpers (INR format)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // If receipt is shown, display receipt view
  if (successReceipt) {
    return (
      <div className="max-w-xl mx-auto space-y-6 font-body">
        {/* Print specific style overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none;
              box-shadow: none;
              padding: 0;
            }
          }
        ` }} />

        {/* Receipt Container */}
        <div id="print-area" className="bg-white border border-light-gray/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-light-gray/40">
            {/* Success Icon */}
            <div className="p-2.5 bg-success/10 text-success rounded-full border border-success/20 mb-3 print:hidden">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-charcoal font-heading print:text-2xl">Payment Receipt</h2>
            <p className="text-xs text-steel-gray font-caption mt-0.5 print:text-sm">Margam Institution Portal</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">Receipt No</span>
              <span className="font-bold text-charcoal font-body">{successReceipt.receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">Date</span>
              <span className="font-semibold text-charcoal font-body">
                {new Date(successReceipt.date).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="border-y border-light-gray/45 py-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-steel-gray font-medium">Student Name</span>
              <span className="font-bold text-charcoal font-heading">{successReceipt.studentName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-steel-gray font-medium">Student ID / Code</span>
              <span className="font-semibold text-charcoal font-body">{successReceipt.studentCode}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-steel-gray font-medium">Class & Section</span>
              <span className="font-semibold text-charcoal font-heading">
                Class {successReceipt.className} - {successReceipt.sectionName}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-steel-gray font-medium">Fee Particular</span>
              <span className="font-semibold text-charcoal font-body">{successReceipt.feeName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-steel-gray font-medium">Payment Mode</span>
              <span className="font-bold text-charcoal font-caption uppercase tracking-wider">{successReceipt.paymentMethod}</span>
            </div>
            {successReceipt.notes && (
              <div className="text-xs pt-1 border-t border-light-gray/25">
                <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">Payment Notes</span>
                <p className="text-charcoal bg-cream/15 p-2 rounded-lg border border-light-gray/30 font-body">
                  {successReceipt.notes}
                </p>
              </div>
            )}
          </div>

          {/* Amount Paid banner */}
          <div className="p-4 bg-success/5 border border-success/15 rounded-xl flex items-center justify-between">
            <span className="text-sm font-bold text-success font-heading">Amount Paid</span>
            <span className="text-xl font-black text-success font-heading">{formatCurrency(successReceipt.amountPaid)}</span>
          </div>

          {successReceipt.remaining > 0 && (
            <div className="flex justify-between items-center text-xs text-steel-gray font-body px-1">
              <span>Remaining Balance Due:</span>
              <span className="font-semibold text-charcoal">{formatCurrency(successReceipt.remaining)}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-xs md:text-sm font-bold text-white bg-primary hover:bg-primary-alt border border-primary/25 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </button>
            <button
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-xs md:text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Record Another Payment
            </button>
          </div>

          <div className="text-center pt-2 print:hidden">
            <Link
              href="/dashboard/fees"
              className="text-xs font-bold text-steel-gray hover:text-primary transition-colors cursor-pointer"
            >
              Go to Fees Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-body">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/fees"
          className="inline-flex items-center gap-2 text-xs font-bold text-steel-gray hover:text-primary transition-colors py-1.5 px-3 bg-white border border-light-gray/60 rounded-xl shadow-sm hover:shadow cursor-pointer active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Fees
        </Link>
      </div>

      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm">
        {/* Form header */}
        <div className="p-5 border-b border-light-gray/40 bg-cream/15 rounded-t-2xl">
          <h2 className="text-lg font-bold text-charcoal font-heading">Record Payment Entry</h2>
          <p className="text-xs text-steel-gray mt-0.5 font-caption">Log a cash or digital payment transaction</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6 min-h-[300px]">
          {errorMsg && (
            <div className="p-4 bg-danger/10 border border-danger/25 text-danger rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Student selection input */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider block">
              Search Student
            </label>
            {selectedStudentId ? (
              <div className="p-4 bg-cream/15 border border-light-gray/50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-charcoal font-heading block">
                    {students.find((s) => s.id === selectedStudentId)?.full_name}
                  </span>
                  <span className="text-xs text-steel-gray font-caption mt-0.5">
                    ID: {students.find((s) => s.id === selectedStudentId)?.student_code} | Class{' '}
                    {students.find((s) => s.id === selectedStudentId)?.class_name} -{' '}
                    {students.find((s) => s.id === selectedStudentId)?.section_name}
                  </span>
                </div>
                {!preselectedStudentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentId('')
                      setStudentSearch('')
                      setFeesData(null)
                    }}
                    className="text-xs font-bold text-danger hover:text-danger/80 transition-colors cursor-pointer"
                  >
                    Change Student
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-steel-gray/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search by student name or code..."
                    className="w-full bg-cream/10 border border-light-gray rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-charcoal outline-none focus:border-secondary transition-colors"
                  />
                </div>
                {showDropdown && studentSearch.trim().length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-light-gray rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="py-3 px-4 text-xs text-steel-gray italic font-body">No matching active students.</div>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full text-left py-2.5 px-4 hover:bg-cream/20 border-b border-light-gray/25 last:border-0 text-xs font-body flex flex-col cursor-pointer"
                        >
                          <span className="font-bold text-charcoal font-heading">{student.full_name}</span>
                          <span className="text-[10px] text-steel-gray font-caption mt-0.5">
                            Code: {student.student_code} | Class {student.class_name} - {student.section_name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dues structures selection */}
          {selectedStudentId && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider block">
                Select Particular Fee Structure
              </label>

              {isLoadingFees ? (
                <div className="py-6 text-center text-xs font-semibold text-secondary animate-pulse">
                  Loading student fee records...
                </div>
              ) : !feesData || feesData.fees.length === 0 ? (
                <div className="p-4 bg-cream/20 text-steel-gray rounded-xl border border-light-gray/45 text-center text-xs font-body">
                  No fee allocations set up for this student&apos;s class.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feesData.fees.map((struct: any) => {
                    const isPaid = struct.status === 'paid'
                    const isSelected = selectedFeeStructureId === struct.id
                    return (
                      <div
                        key={struct.id}
                        onClick={() => !isPaid && handleStructureSelect(struct.id, struct.pending_amount)}
                        className={`p-4 border rounded-2xl flex flex-col justify-between h-32 transition-all relative ${
                          isPaid
                            ? 'bg-light-gray/20 border-light-gray/40 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary cursor-pointer'
                            : 'bg-white border-light-gray hover:border-steel-gray/60 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-charcoal font-heading text-sm line-clamp-1 pr-4">{struct.fee_name}</span>
                            {isPaid ? (
                              <span className="text-[10px] font-bold text-success uppercase">Paid</span>
                            ) : struct.status === 'overdue' ? (
                              <span className="text-[10px] font-bold text-danger uppercase">Overdue</span>
                            ) : (
                              <span className="text-[10px] font-bold text-warning uppercase font-body">Pending</span>
                            )}
                          </div>
                          <p className="text-[10px] text-steel-gray mt-1 font-caption">
                            Due Date:{' '}
                            {struct.due_date
                              ? new Date(struct.due_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="flex justify-between items-end border-t border-light-gray/25 pt-2.5">
                          <div className="text-[10px] font-medium text-steel-gray font-body">
                            Total: <span className="font-semibold text-charcoal">{formatCurrency(struct.amount)}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] text-steel-gray uppercase font-bold tracking-wider font-caption">Outstanding</span>
                            <span className={`text-sm font-black ${isPaid ? 'text-success' : 'text-danger'} font-heading`}>
                              {formatCurrency(struct.pending_amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment Inputs */}
          {selectedFeeStructureId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-light-gray/30">
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider block">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-full bg-cream/10 border border-light-gray rounded-xl py-2.5 px-3 text-sm font-semibold text-charcoal outline-none focus:border-secondary transition-colors"
                />
                <span className="text-[10px] text-steel-gray font-caption block">
                  Outstanding balance:{' '}
                  {formatCurrency(
                    feesData?.fees?.find((f: any) => f.id === selectedFeeStructureId)?.pending_amount || 0
                  )}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider block">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-cream/10 border border-light-gray rounded-xl py-2.5 px-3 text-sm font-semibold text-charcoal outline-none focus:border-secondary transition-colors"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="Card">Card Swipe</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Bank Transfer">Direct Bank Transfer</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider block">
                  Internal Remarks / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes (e.g. transaction ID, depositor name)..."
                  rows={2}
                  className="w-full bg-cream/10 border border-light-gray rounded-xl py-2.5 px-3 text-xs font-medium text-charcoal outline-none focus:border-secondary transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          {selectedFeeStructureId && (
            <div className="flex gap-4 pt-4 border-t border-light-gray/35">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-xs md:text-sm font-bold text-white bg-primary hover:bg-primary-alt disabled:bg-primary/50 border border-primary/25 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Recording transaction...
                  </span>
                ) : (
                  'Confirm & Record Payment'
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
