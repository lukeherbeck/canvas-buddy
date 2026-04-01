export interface CanvasAssignment {
  readonly id: number;
  readonly name: string;
  readonly due_at: string | null;
  readonly points_possible: number;
  readonly course_id: number;
  readonly html_url: string;
  readonly submission_types: readonly string[];
  readonly has_submitted_submissions: boolean;
}

export interface CanvasTodoItem {
  readonly type: "submitting" | "grading";
  readonly assignment: CanvasAssignment | null;
  readonly ignore: string;
  readonly ignore_permanently: string;
  readonly html_url: string;
  readonly needs_grading_count: number | null;
  readonly context_type: string;
  readonly course_id: number | null;
  readonly group_id: number | null;
}

export interface CanvasCourse {
  readonly id: number;
  readonly name: string;
  readonly course_code: string;
  readonly workflow_state: string;
  readonly enrollment_state: string;
}

export interface CanvasConversation {
  readonly id: number;
  readonly subject: string;
  readonly last_message: string;
  readonly last_message_at: string;
  readonly message_count: number;
  readonly workflow_state: "unread" | "read" | "archived";
  readonly participants: readonly CanvasParticipant[];
}

export interface CanvasParticipant {
  readonly id: number;
  readonly name: string;
}

export interface CanvasUpcomingEvent {
  readonly id: string;
  readonly title: string;
  readonly start_at: string;
  readonly end_at: string | null;
  readonly description: string;
  readonly html_url: string;
  readonly context_code: string;
  readonly type: string;
}
