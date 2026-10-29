import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';
import {
  formatLocalTime,
  formatFullDate,
  getDateBlockComponents,
  toIsoDateString,
} from '../utils/formatters';

export default function Appointments() {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin filter state
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedAdminDoctorId, setSelectedAdminDoctorId] = useState('');

  // Cancel dialog state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApptForCancel, setSelectedApptForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Reschedule dialog state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState(null);
  const [rescheduleDays, setRescheduleDays] = useState([]);
  const [rescheduleDateStr, setRescheduleDateStr] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Status updating state (for doctor Complete / No-show)
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Load appointments
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'ADMIN') {
        // If admin has selected a doctor, fetch that doctor's appointments;
        // otherwise fetch doctors list and default to first doctor
        let docId = selectedAdminDoctorId;
        if (!docId) {
          const docs = await api.doctors.getAll();
          setDoctorsList(docs || []);
          if (docs && docs.length > 0) {
            docId = docs[0].id;
            setSelectedAdminDoctorId(docId);
          }
        }
        if (docId) {
          const list = await api.appointments.getDoctorAppointments(docId);
          setAppointments(list || []);
        } else {
          setAppointments([]);
        }
      } else {
        const list = await api.appointments.getMine();
        setAppointments(list || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [role, selectedAdminDoctorId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Handle Admin Doctor change
  const handleAdminDoctorChange = async (e) => {
    const docId = e.target.value;
    setSelectedAdminDoctorId(docId);
  };

  // Group into Upcoming (ascending) and Earlier (descending, last 8)
  const { upcoming, earlier, nextInLineId } = useMemo(() => {
    const now = Date.now();
    const up = [];
    const ear = [];

    appointments.forEach((appt) => {
      const startTimeMs = new Date(appt.slotStartTime).getTime();
      const isBooked = appt.status === 'BOOKED';

      if (isBooked && startTimeMs >= now - 15 * 60 * 1000) {
        up.push(appt);
      } else {
        ear.push(appt);
      }
    });

    // Upcoming sorted ascending
    up.sort((a, b) => new Date(a.slotStartTime) - new Date(b.slotStartTime));

    // Earlier sorted descending, limited to last 8
    ear.sort((a, b) => new Date(b.slotStartTime) - new Date(a.slotStartTime));
    const earlierLimited = ear.slice(0, 8);

    // For doctor queue: find first upcoming BOOKED visit today
    let nextId = null;
    if (role === 'DOCTOR' || role === 'ADMIN') {
      const todayStr = toIsoDateString(new Date());
      const nextBookingToday = up.find((a) => {
        const apptDateStr = toIsoDateString(new Date(a.slotStartTime));
        return a.status === 'BOOKED' && apptDateStr === todayStr;
      });
      if (nextBookingToday) {
        nextId = nextBookingToday.id;
      }
    }

    return {
      upcoming: up,
      earlier: earlierLimited,
      nextInLineId: nextId,
    };
  }, [appointments, role]);

  // Open Cancel Modal
  const openCancelModal = (appt) => {
    setSelectedApptForCancel(appt);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // Submit Cancellation
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApptForCancel) return;
    if (!cancelReason.trim()) {
      showToast('Please provide a brief reason for cancellation.', 'error');
      return;
    }

    setCancelling(true);
    try {
      await api.appointments.cancel(selectedApptForCancel.id, cancelReason.trim());
      showToast('Appointment cancelled successfully. Slot freed.', 'success');
      setCancelModalOpen(false);
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'Unable to cancel appointment.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Update Status (Complete / No-show)
  const handleStatusChange = async (apptId, newStatus) => {
    setUpdatingStatusId(apptId);
    try {
      await api.appointments.updateStatus(apptId, newStatus);
      const label = newStatus === 'COMPLETED' ? 'marked as completed' : 'recorded as no-show';
      showToast(`Appointment ${label}.`, 'success');
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'Unable to update appointment status.', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (appt) => {
    setSelectedApptForReschedule(appt);
    setSelectedNewSlot(null);

    // Prepare next 10 days
    const nextDays = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = toIsoDateString(d);
      nextDays.push({
        date: d,
        isoStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    setRescheduleDays(nextDays);
    setRescheduleDateStr(nextDays[0].isoStr);
    setRescheduleModalOpen(true);
  };

  // Fetch slots for reschedule when doctor or date changes
  useEffect(() => {
    if (!rescheduleModalOpen || !selectedApptForReschedule?.doctorId || !rescheduleDateStr) return;
    let isCancelled = false;

    async function fetchRescheduleSlots() {
      setLoadingRescheduleSlots(true);
      setSelectedNewSlot(null);
      try {
        const data = await api.doctors.getSlots(
          selectedApptForReschedule.doctorId,
          rescheduleDateStr
        );
        if (!isCancelled) {
          setRescheduleSlots(data || []);
        }
      } catch (err) {
        if (!isCancelled) setRescheduleSlots([]);
      } finally {
        if (!isCancelled) setLoadingRescheduleSlots(false);
      }
    }

    fetchRescheduleSlots();
    return () => {
      isCancelled = true;
    };
  }, [rescheduleModalOpen, selectedApptForReschedule?.doctorId, rescheduleDateStr]);

  // Submit Reschedule
  const handleRescheduleSubmit = async () => {
    if (!selectedApptForReschedule || !selectedNewSlot) return;

    setRescheduling(true);
    try {
      await api.appointments.reschedule(
        selectedApptForReschedule.id,
        selectedNewSlot.startTime
      );
      showToast('Appointment successfully rescheduled to new time.', 'success');
      setRescheduleModalOpen(false);
      loadAppointments();
    } catch (err) {
      if (err.status === 409) {
        showToast('That slot was just booked by another visitor. Please pick another.', 'error');
      } else {
        showToast(err.message || 'Reschedule failed. Please try again.', 'error');
      }
    } finally {
      setRescheduling(false);
    }
  };

  // Render an appointment row
  const renderAppointmentRow = (appt) => {
    const { dayNum, weekday, month } = getDateBlockComponents(appt.slotStartTime);
    const timeFormatted = formatLocalTime(appt.slotStartTime);
    const isNextInLine = appt.id === nextInLineId;
    const isBooked = appt.status === 'BOOKED';

    const doctorDisplay = appt.doctorName?.startsWith('Dr.')
      ? appt.doctorName
      : `Dr. ${appt.doctorName}`;

    return (
      <div
        key={appt.id}
        className="glass-row"
        style={{
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: '80px minmax(0, 1fr) auto',
          gap: '20px',
          alignItems: 'center',
          borderLeft: isNextInLine ? '4px solid var(--brass)' : undefined,
        }}
      >
        {/* Date block: large serif day number with small weekday and month */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            background: 'var(--brass-soft)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--glass-edge)',
            textAlign: 'center',
          }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '0.74rem', textTransform: 'capitalize', color: 'var(--ink-soft)' }}>
            {weekday}
          </span>
          <span className="serif-numeral" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.1 }}>
            {dayNum}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--brass)', fontWeight: 600 }}>
            {month}
          </span>
        </div>

        {/* Details Column */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
              {role === 'DOCTOR' ? appt.patientName : doctorDisplay}
            </h3>

            {/* Next in line tag */}
            {isNextInLine && (
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--brass)',
                  padding: '2px 8px',
                  background: 'var(--brass-soft)',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                next in line
              </span>
            )}

            {/* Status chip */}
            <span className={`status-chip ${appt.status?.toLowerCase().replace('_', '')}`}>
              {appt.status?.toLowerCase().replace('_', ' ')}
            </span>
          </div>

          {/* Sub-line */}
          <div className="text-soft" style={{ fontSize: '0.88rem' }}>
            {role === 'DOCTOR' ? (
              <span>Patient &bull; Phone: {appt.patientPhone || 'N/A'}</span>
            ) : (
              <span>{appt.doctorSpecialization} &bull; Room {appt.roomNumber || '101'}</span>
            )}
            {role === 'ADMIN' && (
              <span style={{ display: 'block', marginTop: '2px' }}>
                Patient: {appt.patientName} &bull; Doctor: {doctorDisplay}
              </span>
            )}
          </div>

          {/* Time & Cancellation reason if present */}
          <div style={{ fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--pine)' }}>{timeFormatted}</span>
            {appt.cancellationReason && (
              <span className="text-soft" style={{ fontStyle: 'italic' }}>
                Reason: "{appt.cancellationReason}"
              </span>
            )}
          </div>
        </div>

        {/* Actions Column */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Patient Actions */}
          {(role === 'PATIENT' || role === 'ADMIN') && isBooked && (
            <>
              <button
                type="button"
                onClick={() => openRescheduleModal(appt)}
                className="btn-glass"
                style={{ padding: '6px 14px', fontSize: '0.86rem' }}
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => openCancelModal(appt)}
                className="btn-glass"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.86rem',
                  color: 'var(--status-cancelled)',
                  borderColor: 'rgba(143, 90, 82, 0.4)',
                }}
              >
                Cancel
              </button>
            </>
          )}

          {/* Doctor / Admin Queue Actions */}
          {(role === 'DOCTOR' || role === 'ADMIN') && isBooked && (
            <>
              <button
                type="button"
                disabled={updatingStatusId === appt.id}
                onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                className="btn-pine"
                style={{ padding: '6px 14px', fontSize: '0.86rem' }}
              >
                Complete
              </button>
              <button
                type="button"
                disabled={updatingStatusId === appt.id}
                onClick={() => handleStatusChange(appt.id, 'NO_SHOW')}
                className="btn-brass-outline"
                style={{ padding: '6px 14px', fontSize: '0.86rem' }}
              >
                No-show
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>
            {role === 'DOCTOR' ? "Today's queue and visits" : 'Your appointments'}
          </h1>
          <p className="text-soft" style={{ fontSize: '1rem' }}>
            {role === 'DOCTOR'
              ? 'Consultation schedule and patient attendance management.'
              : 'Review your upcoming hospital visits and consultation history.'}
          </p>
        </div>

        {/* Admin Doctor Switcher */}
        {role === 'ADMIN' && doctorsList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="admin-doctor-filter" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Viewing schedule for:
            </label>
            <select
              id="admin-doctor-filter"
              value={selectedAdminDoctorId}
              onChange={handleAdminDoctorChange}
              className="btn-glass"
              style={{ padding: '8px 12px', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.fullName} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Skeleton height="78px" style={{ borderRadius: 'var(--radius-row)' }} />
          <Skeleton height="78px" style={{ borderRadius: 'var(--radius-row)' }} />
          <Skeleton height="78px" style={{ borderRadius: 'var(--radius-row)' }} />
        </div>
      )}

      {/* Error state with retry */}
      {error && <ErrorState message={error} onRetry={loadAppointments} />}

      {/* Content when loaded */}
      {!loading && !error && (
        <>
          {/* Upcoming Appointments Group */}
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
              Upcoming
            </h2>

            {upcoming.length === 0 ? (
              <div
                className="glass-card"
                style={{ padding: '28px', textAlign: 'center' }}
              >
                <p className="text-soft" style={{ marginBottom: '14px' }}>
                  Nothing booked yet. Open Book a visit to choose a time.
                </p>
                {(role === 'PATIENT' || role === 'ADMIN') && (
                  <Link to="/book" className="btn-pine" style={{ textDecoration: 'none' }}>
                    Book a visit
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcoming.map(renderAppointmentRow)}
              </div>
            )}
          </section>

          {/* Earlier Appointments Group */}
          <section aria-labelledby="earlier-heading" style={{ marginTop: '16px' }}>
            <h2 id="earlier-heading" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
              Earlier
            </h2>

            {earlier.length === 0 ? (
              <div
                className="glass-card"
                style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}
              >
                No previous visits on record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {earlier.map(renderAppointmentRow)}
              </div>
            )}
          </section>
        </>
      )}

      {/* Cancel Modal with Reason Form */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel appointment"
      >
        <form onSubmit={handleCancelSubmit}>
          <p className="text-soft" style={{ marginBottom: '16px', fontSize: '0.92rem' }}>
            Please let us know the reason for cancelling this appointment. This will immediately free
            the slot for other patients.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="cancel-reason"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}
            >
              Cancellation reason
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Sudden travel, schedule conflict, recovered"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-slot)',
                border: '1px solid var(--glass-edge)',
                background: 'var(--glass)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="btn-glass"
            >
              Keep visit
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="btn-glass"
              style={{
                background: 'var(--status-cancelled-bg)',
                color: 'var(--status-cancelled)',
                borderColor: 'var(--status-cancelled)',
              }}
            >
              {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal with Slot Grid */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule appointment"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span className="text-soft" style={{ fontSize: '0.86rem' }}>
              Physician:
            </span>
            <div className="doctor-name" style={{ fontSize: '1.2rem', marginTop: '2px' }}>
              {selectedApptForReschedule?.doctorName}
            </div>
          </div>

          {/* Day selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
              Select a new date:
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {rescheduleDays.map((d) => {
                const isSelected = rescheduleDateStr === d.isoStr;
                return (
                  <button
                    key={d.isoStr}
                    type="button"
                    onClick={() => setRescheduleDateStr(d.isoStr)}
                    className="btn-glass"
                    style={{
                      flex: '0 0 68px',
                      padding: '8px 4px',
                      flexDirection: 'column',
                      gap: '2px',
                      borderRadius: 'var(--radius-slot)',
                      background: isSelected ? 'var(--glass-strong)' : 'var(--glass)',
                      borderColor: isSelected ? 'var(--brass)' : 'var(--glass-edge)',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', color: 'var(--ink-soft)' }}>{d.dayName}</span>
                    <span className="serif-numeral" style={{ fontSize: '1.3rem', fontWeight: 600 }}>{d.dayNum}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--brass)' }}>{d.monthName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
              Select an open time slot:
            </label>

            {loadingRescheduleSlots && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="38px" style={{ borderRadius: 'var(--radius-slot)' }} />
                ))}
              </div>
            )}

            {!loadingRescheduleSlots && rescheduleSlots.length === 0 && (
              <p className="text-soft" style={{ fontSize: '0.88rem' }}>
                No consultation slots open on this date.
              </p>
            )}

            {!loadingRescheduleSlots && rescheduleSlots.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {rescheduleSlots.map((s, idx) => {
                  const isPast = new Date(s.startTime).getTime() < Date.now();
                  const isAvailable = s.available && !isPast;
                  const isSelected = selectedNewSlot?.startTime === s.startTime;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedNewSlot(s)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 'var(--radius-slot)',
                        border: '1px solid var(--glass-edge)',
                        background: isSelected ? 'var(--pine)' : isAvailable ? 'var(--glass)' : 'rgba(0,0,0,0.05)',
                        color: isSelected ? 'var(--on-pine)' : isAvailable ? 'var(--ink)' : 'var(--ink-soft)',
                        borderColor: isSelected ? 'var(--brass)' : 'var(--glass-edge)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        textDecoration: !s.available ? 'line-through' : 'none',
                        opacity: !isAvailable ? 0.45 : 1,
                      }}
                    >
                      {formatLocalTime(s.startTime)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="btn-glass"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedNewSlot || rescheduling}
              onClick={handleRescheduleSubmit}
              className="btn-pine"
            >
              {rescheduling ? 'Rescheduling...' : 'Confirm new slot'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
