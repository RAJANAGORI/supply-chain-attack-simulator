'use client';

import { useEffect, useState } from 'react';
import { cp, type ClassroomRole } from '@/lib/api';

const STUDENT_KEY = 'scas-classroom-student';

/**
 * The tabletop role this browser picked when it joined the classroom, or
 * undefined when it never joined (solo play sees every decision).
 */
export function useClassroomRole(): ClassroomRole | undefined {
  const [role, setRole] = useState<ClassroomRole | undefined>();

  useEffect(() => {
    let cancelled = false;
    const studentId = localStorage.getItem(STUDENT_KEY);
    if (!studentId) return;
    cp.getClassroom()
      .then((room) => {
        if (cancelled) return;
        setRole(room.students.find((s) => s.id === studentId)?.role);
      })
      .catch(() => {
        /* classroom is optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
