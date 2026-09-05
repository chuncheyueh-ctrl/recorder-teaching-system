"use client";

import { useAppState } from "@/state/app-state-provider";
import { TopBar } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { TodayPage } from "@/components/today/today-page";
import { RecordsPage } from "@/components/records/records-page";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { MorePage } from "@/components/more/more-page";
import { RecordDialog } from "@/components/dialogs/record-dialog";
import { AvailabilityDialog } from "@/components/dialogs/availability-dialog";
import { TeacherDialog } from "@/components/dialogs/teacher-dialog";
import { StudentDialog } from "@/components/dialogs/student-dialog";
import { SlotDialog } from "@/components/dialogs/slot-dialog";
import { EventDialog } from "@/components/dialogs/event-dialog";
import { WelcomeScreen } from "@/components/welcome/welcome-screen";

export default function Home() {
  const { page } = useAppState();

  return (
    <div className="app">
      <WelcomeScreen />
      <TopBar />

      {page === "today" && <TodayPage />}
      {page === "records" && <RecordsPage />}
      {page === "calendar" && <CalendarPage />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "more" && <MorePage />}

      <TabBar />

      <RecordDialog />
      <AvailabilityDialog />
      <TeacherDialog />
      <StudentDialog />
      <SlotDialog />
      <EventDialog />
    </div>
  );
}
