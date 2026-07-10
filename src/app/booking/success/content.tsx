"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Calendar, Clock, User, MapPin, Stethoscope } from "lucide-react";

export default function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = searchParams.get("date") || "";
  const startTime = searchParams.get("start_time") || "";
  const endTime = searchParams.get("end_time") || "";
  const doctorName = searchParams.get("doctor_name") || "Doctor";
  const clinicName = searchParams.get("clinic_name") || "Clinic";

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-center">
          <div className="bg-green-500 p-6">
            <CheckCircle className="w-16 h-16 text-white mx-auto" />
          </div>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h1>
            <p className="text-gray-600 mb-6">Your appointment has been successfully booked.</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500">Doctor</p>
                  <p className="text-sm font-medium text-gray-900">{doctorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500">Clinic</p>
                  <p className="text-sm font-medium text-gray-900">{clinicName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium text-gray-900">{startTime} - {endTime}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button onClick={() => router.push("/patient/appointments")} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">
                View My Appointments
              </button>
              <button onClick={() => router.push("/patient")} className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium">
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
