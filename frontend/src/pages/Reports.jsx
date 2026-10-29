import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { toIsoDateString, formatFullDate } from '../utils/formatters';

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState(() => toIsoDateString(new Date()));

  const [dailyReport, setDailyReport] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [dailyError, setDailyError] = useState(null);

  const [busiestDoctors, setBusiestDoctors] = useState([]);
  const [loadingBusiest, setLoadingBusiest] = useState(true);
  const [busiestError, setBusiestError] = useState(null);

  // Fetch daily report
  const loadDailyReport = useCallback(async () => {
    setLoadingDaily(true);
    setDailyError(null);
    try {
      const data = await api.reports.getDaily(selectedDate);
      setDailyReport(data);
    } catch (err) {
      setDailyError(err.message || 'Unable to load daily operations report.');
    } finally {
      setLoadingDaily(false);
    }
  }, [selectedDate]);

  // Fetch busiest doctors (covering 7 days up to selectedDate)
  const loadBusiestDoctors = useCallback(async () => {
    setLoadingBusiest(true);
    setBusiestError(null);
    try {
      const endD = new Date(selectedDate + 'T00:00:00');
      const startD = new Date(endD);
      startD.setDate(endD.getDate() - 6);

      const startDateStr = toIsoDateString(startD);
      const endDateStr = toIsoDateString(endD);

      const list = await api.reports.getBusiestDoctors(startDateStr, endDateStr, 5);
      setBusiestDoctors(list || []);
    } catch (err) {
      setBusiestError(err.message || 'Unable to load busiest doctors analysis.');
    } finally {
      setLoadingBusiest(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDailyReport();
    loadBusiestDoctors();
  }, [loadDailyReport, loadBusiestDoctors]);

  // Calculations for daily summary sentence and segmented bar
  const total = dailyReport?.totalAppointments || 0;
  const booked = dailyReport?.bookedCount || 0;
  const completed = dailyReport?.completedCount || 0;
  const cancelled = dailyReport?.cancelledCount || 0;
  const noshow = dailyReport?.noShowCount || 0;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Day name for sentence
  const targetDateObj = new Date(selectedDate + 'T00:00:00');
  const weekdayName = targetDateObj.toLocaleDateString('en-US', { weekday: 'long' });

  // Max count for busiest doctors scale
  const maxDoctorAppointments = Math.max(
    ...busiestDoctors.map((d) => d.appointmentCount || 0),
    1
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Header and Date Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '6px' }}>Operational analytics</h1>
          <p className="text-soft" style={{ fontSize: '1rem' }}>
            Daily throughput metrics and physician consultation distribution.
          </p>
        </div>

        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="report-date-picker" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
            Report date:
          </label>
          <input
            id="report-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="btn-glass"
            style={{
              padding: '8px 14px',
              fontSize: '0.92rem',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Section 1: Daily Throughput (Large Serif Sentence + Segmented Bar) */}
      <section aria-labelledby="daily-heading">
        <h2 id="daily-heading" style={{ fontSize: '1.6rem', marginBottom: '16px' }}>
          Daily summary
        </h2>

        {loadingDaily && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <Skeleton height="40px" width="70%" style={{ marginBottom: '14px' }} />
            <Skeleton height="24px" width="45%" style={{ marginBottom: '24px' }} />
            <Skeleton height="32px" style={{ borderRadius: 'var(--radius-pill)' }} />
          </div>
        )}

        {dailyError && <ErrorState message={dailyError} onRetry={loadDailyReport} />}

        {!loadingDaily && !dailyError && dailyReport && (
          <div className="glass-panel" style={{ padding: '36px 32px' }}>
            {/* Large Serif Sentences */}
            <div style={{ marginBottom: '28px' }}>
              <div
                className="serif-heading"
                style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.2, color: 'var(--ink)' }}
              >
                {total === 1
                  ? `1 appointment on ${weekdayName}`
                  : `${total} appointments on ${weekdayName}`}
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  color: 'var(--ink-soft)',
                  marginTop: '8px',
                  fontWeight: 400,
                }}
              >
                {completed} completed, which is a {completionRate}% completion rate
              </div>
            </div>

            {/* Segmented status bar */}
            {total > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    height: '24px',
                    width: '100%',
                    borderRadius: 'var(--radius-pill)',
                    overflow: 'hidden',
                    display: 'flex',
                    background: 'var(--brass-soft)',
                    border: '1px solid var(--glass-edge)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  role="progressbar"
                  aria-label="Appointment distribution across statuses"
                >
                  {booked > 0 && (
                    <div
                      style={{
                        width: `${(booked / total) * 100}%`,
                        background: 'var(--status-booked)',
                        transition: 'width var(--transition-base)',
                      }}
                      title={`Booked: ${booked}`}
                    />
                  )}
                  {completed > 0 && (
                    <div
                      style={{
                        width: `${(completed / total) * 100}%`,
                        background: 'var(--status-completed)',
                        transition: 'width var(--transition-base)',
                      }}
                      title={`Completed: ${completed}`}
                    />
                  )}
                  {cancelled > 0 && (
                    <div
                      style={{
                        width: `${(cancelled / total) * 100}%`,
                        background: 'var(--status-cancelled)',
                        transition: 'width var(--transition-base)',
                      }}
                      title={`Cancelled: ${cancelled}`}
                    />
                  )}
                  {noshow > 0 && (
                    <div
                      style={{
                        width: `${(noshow / total) * 100}%`,
                        background: 'var(--status-noshow)',
                        transition: 'width var(--transition-base)',
                      }}
                      title={`No-show: ${noshow}`}
                    />
                  )}
                </div>

                {/* Legend of counts */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--status-booked)',
                      }}
                    />
                    <span>Booked: {booked}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--status-completed)',
                      }}
                    />
                    <span>Completed: {completed}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--status-cancelled)',
                      }}
                    />
                    <span>Cancelled: {cancelled}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--status-noshow)',
                      }}
                    />
                    <span>No-show: {noshow}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-soft" style={{ fontSize: '0.95rem' }}>
                No appointment activities logged on this date.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Busiest Doctors (Horizontal pine-to-brass gradient bars) */}
      <section aria-labelledby="busiest-heading">
        <div style={{ marginBottom: '16px' }}>
          <h2 id="busiest-heading" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
            Busiest doctors
          </h2>
          <p className="text-soft" style={{ fontSize: '0.92rem' }}>
            Top consultations across the 7-day period up to {formatFullDate(selectedDate)}.
          </p>
        </div>

        {loadingBusiest && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Skeleton height="36px" width="90%" />
            <Skeleton height="36px" width="75%" />
            <Skeleton height="36px" width="60%" />
          </div>
        )}

        {busiestError && <ErrorState message={busiestError} onRetry={loadBusiestDoctors} />}

        {!loadingBusiest && !busiestError && busiestDoctors.length === 0 && (
          <div className="glass-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            No recorded physician consultations during this 7-day timeframe.
          </div>
        )}

        {!loadingBusiest && !busiestError && busiestDoctors.length > 0 && (
          <div className="glass-panel" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {busiestDoctors.map((doc, idx) => {
              const widthPct = Math.max(
                Math.round((doc.appointmentCount / maxDoctorAppointments) * 100),
                8
              );

              return (
                <div key={doc.doctorId || idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                    <span style={{ fontWeight: 600 }}>
                      {doc.doctorName?.startsWith('Dr.') ? doc.doctorName : `Dr. ${doc.doctorName}`}{' '}
                      <span className="text-soft" style={{ fontWeight: 400 }}>
                        ({doc.specialization})
                      </span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--brass)' }}>
                      {doc.appointmentCount} {doc.appointmentCount === 1 ? 'visit' : 'visits'}
                    </span>
                  </div>

                  {/* Horizontal pine-to-brass gradient bar */}
                  <div
                    style={{
                      height: '18px',
                      width: '100%',
                      background: 'var(--brass-soft)',
                      borderRadius: 'var(--radius-pill)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${widthPct}%`,
                        background: 'linear-gradient(90deg, var(--pine) 0%, var(--brass) 100%)',
                        borderRadius: 'var(--radius-pill)',
                        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
