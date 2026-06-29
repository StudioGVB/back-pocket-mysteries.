"use client";

import React, { useEffect, useState } from 'react';

export default function CopyrightYear() {
  const [year, setYear] = useState<number>(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
