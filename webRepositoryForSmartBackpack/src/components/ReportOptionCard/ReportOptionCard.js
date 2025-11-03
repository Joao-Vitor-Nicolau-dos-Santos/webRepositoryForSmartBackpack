import Link from 'next/link';
import React from 'react';

const ReportOptionCard = ({ titulo, href, Icon }) => {
  return (
    <Link href={href} passHref>
      <div className="w-full bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-500 cursor-pointer border border-green-200">
        <div className="p-6 flex items-center justify-center space-x-4">
          {Icon && <Icon className="text-2xl text-green-500" />}
          <h3 className="text-xl font-semibold text-gray-800">{titulo}</h3>
        </div>
      </div>
    </Link>
  );
};

export default ReportOptionCard;