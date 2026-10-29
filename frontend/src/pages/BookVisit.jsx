import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import {
  formatLocalTime,
  formatFullDate,
  formatCurrencyINR,
  getTimeOfDayGreeting,
  toIsoDateString,
} from '../utils/formatters';

export default function BookVisit() {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState(null);

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);

  // Days state: next 10 days
  const [days, setDays] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Slots state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  // Selected slot
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Generate next 10 days starting from today
  useEffect(() => {
    const nextDays = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = toIsoDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Thu"
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' }); // "Oct"
      const dayOfWeekUpper = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(); // "THURSDAY"
      nextDays.push({
        date: d,
        isoStr,
        dayName,
        dayNum,
        monthName,
        dayOfWeekUpper,
      });
    }
    setDays(nextDays);
    setSelectedDateStr(nextDays[0].isoStr);
  }, []);

  // Fetch doctors
  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    setDoctorsError(null);
    try {
      const data = await api.doctors.getAll();
      setDoctors(data || []);
      if (data && data.length > 0 && !selectedDoctor) {
        setSelectedDoctor(data[0]);
      }
    } catch (err) {
      setDoctorsError(err.message || 'Unable to load doctor directory.');
    } finally {
      setLoadingDoctors(false);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // When selected doctor changes, fetch their availabilities
  useEffect(() => {
    if (!selectedDoctor?.id) return;
    let isCancelled = false;

    async function fetchAvailabilities() {
      try {
        const data = await api.doctors.getAvailabilities(selectedDoctor.id);
        if (!isCancelled) {
          setAvailabilities(data || []);
        }
      } catch (e) {
        if (!isCancelled) setAvailabilities([]);
      }
    }

    fetchAvailabilities();
    setSelectedSlot(null);

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor]);

  // Check if a day is active in the doctor's weekly schedule
  const isDoctorWorkingOnDay = (dayOfWeekUpper) => {
    if (!availabilities || availabilities.length === 0) return true; // Default fallback to available if unconfigured
    return availabilities.some(
      (a) => a.active && a.dayOfWeek === dayOfWeekUpper
    );
  };

  // Fetch slots for selected doctor & selected date
  const loadSlots = useCallback(async () => {
    if (!selectedDoctor?.id || !selectedDateStr) return;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);
    try {
      const data = await api.doctors.getSlots(selectedDoctor.id, selectedDateStr);
      setSlots(data || []);
    } catch (err) {
      setSlotsError(err.message || 'Unable to retrieve available consultation slots.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor?.id, selectedDateStr]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Handle Booking Confirmation
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    if (role === 'ADMIN') {
      showToast('Admin accounts can inspect doctor schedules. Switch to a patient account to book.', 'info');
      return;
    }

    setBookingInProgress(true);
    try {
      await api.appointments.book({
        doctorId: selectedDoctor.id,
        slotStartTime: selectedSlot.startTime,
      });

      const formattedTime = formatLocalTime(selectedSlot.startTime);
      const doctorDisplayName = selectedDoctor.fullName.startsWith('Dr.')
        ? selectedDoctor.fullName
        : `Dr. ${selectedDoctor.fullName}`;
      showToast(`Booked with ${doctorDisplayName} at ${formattedTime}`, 'success');

      setSelectedSlot(null);
      // Refresh slots
      loadSlots();
    } catch (err) {
      if (err.status === 409) {
        showToast('That time was just taken. Please choose another.', 'error');
        loadSlots();
      } else {
        showToast(err.message || 'Booking failed. Please try again.', 'error');
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  const greeting = getTimeOfDayGreeting(user?.fullName?.split(' ')[0]);

  // Calculate open slot count
  const openSlotCount = slots.filter((s) => {
    const isPast = new Date(s.startTime).getTime() < Date.now();
    return s.available && !isPast;
  }).length;
  const totalSlotsCount = slots.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Greeting & Guidance */}
      <div>
        <h1 style={{ marginBottom: '8px' }}>{greeting}</h1>
        <p className="text-soft" style={{ fontSize: '1.05rem', maxWidth: '640px' }}>
          Select a physician and an open appointment time below to schedule your consultation.
        </p>
      </div>

      {/* Main split: Left Side (Doctor cards, Day picker, Slots) and Right Side (Sticky Your visit) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '28px',
          alignItems: 'start',
        }}
        className="book-visit-grid"
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Section 1: Our Doctors */}
          <section aria-labelledby="doctors-heading">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="doctors-heading" style={{ fontSize: '1.6rem' }}>Our doctors</h2>
              <span className="text-soft" style={{ fontSize: '0.88rem' }}>
                {doctors.length} available
              </span>
            </div>

            {loadingDoctors && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Skeleton height="160px" style={{ borderRadius: 'var(--radius-card)' }} />
                <Skeleton height="160px" style={{ borderRadius: 'var(--radius-card)' }} />
              </div>
            )}

            {doctorsError && (
              <ErrorState message={doctorsError} onRetry={loadDoctors} />
            )}

            {!loadingDoctors && !doctorsError && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  const monogram = doc.fullName
                    ? doc.fullName.replace(/^(Dr\.\s*)/i, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                    : 'DR';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedDoctor(doc);
                        }
                      }}
                      className={isSelected ? 'glass-panel-sm glass-strong' : 'glass-card'}
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--brass)' : 'var(--glass-edge)',
                        boxShadow: isSelected
                          ? '0 0 0 2px var(--brass), var(--glass-shadow)'
                          : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                      }}
                      aria-pressed={isSelected}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Brass-ringed monogram circle */}
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            border: '2px solid var(--brass)',
                            background: 'var(--glass-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--ink)',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          {monogram}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="doctor-name" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.fullName.startsWith('Dr.') ? doc.fullName : `Dr. ${doc.fullName}`}
                          </h3>
                          <div className="text-pine" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                            {doc.specialization}
                          </div>
                        </div>
                      </div>

                      {doc.bio && (
                        <p className="text-soft" style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                          {doc.bio}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--glass-edge)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span className="text-soft">Room {doc.roomNumber || '101'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--brass)', fontSize: '1rem' }}>
                          {formatCurrencyINR(doc.consultationFee)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Pick a Day */}
          {selectedDoctor && (
            <section aria-labelledby="day-heading">
              <h2 id="day-heading" style={{ fontSize: '1.6rem', marginBottom: '16px' }}>
                Pick a day
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                }}
                role="radiogroup"
                aria-label="Appointment day selection"
              >
                {days.map((d) => {
                  const isSelected = selectedDateStr === d.isoStr;
                  const isWorking = isDoctorWorkingOnDay(d.dayOfWeekUpper);

                  return (
                    <button
                      key={d.isoStr}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isWorking}
                      onClick={() => setSelectedDateStr(d.isoStr)}
                      className="btn-glass"
                      style={{
                        flex: '0 0 74px',
                        padding: '12px 6px',
                        flexDirection: 'column',
                        gap: '4px',
                        borderRadius: 'var(--radius-card)',
                        background: isSelected ? 'var(--glass-strong)' : 'var(--glass)',
                        borderColor: isSelected ? 'var(--brass)' : 'var(--glass-edge)',
                        boxShadow: isSelected
                          ? '0 0 0 2px var(--brass), var(--glass-shadow)'
                          : undefined,
                        opacity: isWorking ? 1 : 0.4,
                        cursor: isWorking ? 'pointer' : 'not-allowed',
                      }}
                      title={!isWorking ? 'Doctor is not scheduled on this day' : undefined}
                    >
                      <span style={{ fontSize: '0.78rem', textTransform: 'capitalize', color: 'var(--ink-soft)' }}>
                        {d.dayName}
                      </span>
                      <span className="serif-numeral" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                        {d.dayNum}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--brass)' }}>
                        {d.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 3: Slots */}
          {selectedDoctor && selectedDateStr && (
            <section aria-labelledby="slots-heading">
              <div style={{ marginBottom: '16px' }}>
                <h2 id="slots-heading" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
                  {formatFullDate(selectedDateStr)}
                </h2>
                <p className="text-soft" style={{ fontSize: '0.92rem' }}>
                  {loadingSlots
                    ? 'Checking schedule availability...'
                    : `${openSlotCount} of ${totalSlotsCount} half-hour slots are open`}
                </p>
              </div>

              {loadingSlots && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} height="44px" style={{ borderRadius: 'var(--radius-slot)' }} />
                  ))}
                </div>
              )}

              {slotsError && (
                <ErrorState message={slotsError} onRetry={loadSlots} />
              )}

              {!loadingSlots && !slotsError && slots.length === 0 && (
                <div
                  className="glass-card"
                  style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-soft)' }}
                >
                  No scheduled consultation hours for this date.
                </div>
              )}

              {!loadingSlots && !slotsError && slots.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '10px',
                  }}
                  role="radiogroup"
                  aria-label="Available appointment times"
                >
                  {slots.map((slot, idx) => {
                    const isPast = new Date(slot.startTime).getTime() < Date.now();
                    const isAvailable = slot.available && !isPast;
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const timeLabel = formatLocalTime(slot.startTime);

                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className="slot-btn"
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-slot)',
                          border: '1px solid var(--glass-edge)',
                          background: isSelected
                            ? 'var(--pine)'
                            : isAvailable
                            ? 'var(--glass)'
                            : 'rgba(0, 0, 0, 0.05)',
                          color: isSelected
                            ? 'var(--on-pine)'
                            : isAvailable
                            ? 'var(--ink)'
                            : 'var(--ink-soft)',
                          borderColor: isSelected
                            ? 'var(--brass)'
                            : 'var(--glass-edge)',
                          textDecoration: !slot.available ? 'line-through' : 'none',
                          opacity: !isAvailable ? 0.45 : 1,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          transition: 'transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast)',
                        }}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Sticky "Your visit" Panel */}
        <div
          className="glass-panel your-visit-panel"
          style={{
            position: 'sticky',
            top: '24px',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--glass-edge)', paddingBottom: '12px' }}>
            Your visit
          </h2>

          {!selectedSlot ? (
            <div style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.6, padding: '16px 0' }}>
              Select a time on the left and your visit details will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span className="text-soft" style={{ fontSize: '0.78rem' }}>
                  Doctor
                </span>
                <div className="doctor-name" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
                  {selectedDoctor?.fullName?.startsWith('Dr.')
                    ? selectedDoctor.fullName
                    : `Dr. ${selectedDoctor?.fullName}`}
                </div>
                <div className="text-pine" style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {selectedDoctor?.specialization}
                </div>
              </div>

              <div>
                <span className="text-soft" style={{ fontSize: '0.78rem' }}>
                  Date and time
                </span>
                <div style={{ fontWeight: 600, fontSize: '0.96rem', marginTop: '2px' }}>
                  {formatFullDate(selectedDateStr)}
                </div>
                <div className="text-brass" style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '2px' }}>
                  {formatLocalTime(selectedSlot.startTime)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-edge)', paddingTop: '14px' }}>
                <div>
                  <span className="text-soft" style={{ fontSize: '0.78rem' }}>
                    Room
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    {selectedDoctor?.roomNumber || '101'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-soft" style={{ fontSize: '0.78rem' }}>
                    Consultation fee
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--brass)', fontSize: '1.15rem' }}>
                    {formatCurrencyINR(selectedDoctor?.consultationFee)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={bookingInProgress}
                className="btn-pine"
                style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              >
                {bookingInProgress ? 'Confirming...' : 'Confirm booking'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .book-visit-grid {
            grid-template-columns: 1fr !important;
          }
          .your-visit-panel {
            position: static !important;
          }
        }
        .slot-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: var(--brass);
        }
      `}</style>
    </div>
  );
}
