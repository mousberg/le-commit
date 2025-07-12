import React from "react";
import BoardClientLayout from "../../components/BoardClientLayout";

export default function BoardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <BoardClientLayout>
        {children}
      </BoardClientLayout>
    </div>
  );
}