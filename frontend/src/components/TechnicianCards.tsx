'use client';

import { Phone, Star, MapPin, Clock, CheckCircle, XCircle, Wrench, ExternalLink } from 'lucide-react';
import type { Technician } from '@/store/chatStore';

interface Props {
  technicians: Technician[];
}

export default function TechnicianCards({ technicians }: Props) {
  if (!technicians || technicians.length === 0) return null;

  const allMock = technicians.every((t) => t.isMock);

  return (
    <div className="technicians-section">
      <div className="technicians-label">
        <Wrench size={18} strokeWidth={1.5} />
        Nearby Technicians
        {allMock && (
          <span className="tech-demo-badge">Demo — allow location for real results</span>
        )}
      </div>

      <div className="technician-cards">
        {technicians.map((tech, idx) => (
          <div key={tech.id} className={`tech-card ${idx === 0 && !tech.isMock ? 'recommended' : ''}`}>

            {/* Header */}
            <div className="tech-card-header">
              {tech.photo ? (
                <img src={tech.photo} alt={tech.name} className="tech-avatar-img" />
              ) : (
                <div className="tech-avatar">
                  <Wrench size={24} strokeWidth={1.5} />
                </div>
              )}

              <div className="tech-info">
                <div className="tech-name">
                  {tech.name}
                  {idx === 0 && !tech.isMock && (
                    <span className="tech-recommended-badge">
                      <Star size={12} fill="currentColor" strokeWidth={0} /> Closest
                    </span>
                  )}
                </div>

                <div className="tech-stats">
                  {tech.rating != null ? (
                    <span className="tech-rating">
                      <Star size={11} fill="currentColor" strokeWidth={0} />
                      {tech.rating.toFixed(1)}
                      {tech.reviewCount > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          ({tech.reviewCount})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No rating</span>
                  )}
                  {tech.distance != null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin size={11} strokeWidth={1.5} />
                      {tech.distance} km
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Clock size={11} strokeWidth={1.5} />
                    {tech.responseTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <p className="tech-address">
              <MapPin size={12} strokeWidth={1.5} /> {tech.address}
            </p>

            {/* Specializations */}
            <div className="tech-specializations">
              {tech.specializations.map((s) => (
                <span key={s} className="tech-spec-tag">{s}</span>
              ))}
              {tech.priceRange !== 'Contact for quote' && (
                <span className="tech-spec-tag">{tech.priceRange}</span>
              )}
            </div>

            {/* Footer */}
            <div className="tech-card-footer">
              {tech.phone ? (
                <a href={`tel:${tech.phone}`} className="tech-call-btn">
                  <Phone size={13} strokeWidth={1.5} />
                  {tech.phone}
                </a>
              ) : tech.mapsLink ? (
                <a href={tech.mapsLink} target="_blank" rel="noopener noreferrer" className="tech-call-btn tech-maps-btn">
                  <ExternalLink size={13} strokeWidth={1.5} />
                  View on Map
                </a>
              ) : (
                <span className="tech-call-btn tech-call-disabled">
                  <Phone size={13} strokeWidth={1.5} />
                  No phone listed
                </span>
              )}

              {tech.available != null ? (
                <span className={`tech-availability ${tech.available ? 'available' : 'busy'}`}>
                  {tech.available ? (
                    <><CheckCircle size={11} strokeWidth={1.5} /> Open</>
                  ) : (
                    <><XCircle size={11} strokeWidth={1.5} /> Closed</>
                  )}
                </span>
              ) : null}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
