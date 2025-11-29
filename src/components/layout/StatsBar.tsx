import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface StatsBarProps {
  totalSchools: number;
  filteredSchools: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    Math.round(current)
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function StatsBar({
  totalSchools,
  filteredSchools,
}: StatsBarProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl p-4 mb-6">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-sm text-white/70 drop-shadow-md">總學校數</div>
          <div className="text-2xl font-bold text-white drop-shadow-lg">
            <AnimatedNumber value={totalSchools} />
          </div>
        </div>
        <div>
          <div className="text-sm text-white/70 drop-shadow-md">符合篩選</div>
          <div className="text-2xl font-bold text-blue-300 drop-shadow-lg">
            <AnimatedNumber value={filteredSchools} />
          </div>
        </div>
      </div>
    </div>
  );
}
