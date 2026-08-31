'use client';

import React from 'react';

interface BadgeProps {
  status: string;
  label?: string;
}

export default function Badge({ status, label }: BadgeProps) {
  let mappedStatus = status.toLowerCase().replace(/\s+/g, '_');
  
  // Custom mapping if needed, otherwise rely on globals.css badge classes like .badge.validee
  return (
    <span className={`badge ${mappedStatus}`}>
      {label || status}
    </span>
  );
}
