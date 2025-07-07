export interface Signal {
    name: string
    description: string
    importance: number // 0 - 1
    requiresCV: boolean
    requiresLinkedIn: boolean
}

export interface SignalEvaluation {
    evaluation_score: number // 0 - 1
    reason: string
}
