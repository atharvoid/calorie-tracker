import { describe, it, expect, vi } from "vitest"
import { dodo } from "@/lib/dodo"

vi.mock("@/lib/dodo", () => {
  return {
    dodo: {
      webhooks: {
        unwrap: vi.fn(),
      },
    },
  }
})

describe("Dodo Payments Webhook Integration", () => {
  it("unwraps webhook events with correct parameters", () => {
    const rawBody = JSON.stringify({
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        status: "active",
      },
    })
    
    const headers = {
      "webhook-id": "wh_123",
      "webhook-signature": "sig_123",
      "webhook-timestamp": "123456",
    }
    
    const mockUnwrap = vi.mocked(dodo.webhooks.unwrap)
    mockUnwrap.mockReturnValueOnce({
      id: "evt_123",
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        status: "active",
      },
    } as any)

    const result = dodo.webhooks.unwrap(rawBody, {
      headers,
      key: "secret_123",
    })

    expect(mockUnwrap).toHaveBeenCalledWith(rawBody, {
      headers,
      key: "secret_123",
    })
    expect(result.type).toBe("subscription.active")
  })
})
