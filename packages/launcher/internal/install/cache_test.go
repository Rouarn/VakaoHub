package install

import "testing"

func TestScanCacheReusesUntilInvalidated(t *testing.T) {
	var cache scanCache[int]
	calls := 0
	build := func() int {
		calls++
		return calls
	}

	if got := cache.get(build); got != 1 {
		t.Fatalf("首次取值应为 1，实际 %d", got)
	}
	if got := cache.get(build); got != 1 || calls != 1 {
		t.Fatalf("TTL 内应复用缓存，实际值 %d、构建次数 %d", got, calls)
	}

	cache.reset()
	if got := cache.get(build); got != 2 {
		t.Fatalf("失效后应重新构建，实际 %d", got)
	}
}
