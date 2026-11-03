package install

import (
	"sync"
	"time"
)

// Detected 是一个在卸载注册表 / 约定安装目录中发现的已安装程序。
type Detected struct {
	Path    string
	Version string
}

// indexTTL 是已安装应用索引的兜底有效期：用户绕过启动器自行安装时，
// 最迟 30 秒后能被 FindApps 看到。安装/卸载流程会主动失效，无需等待 TTL。
const indexTTL = 30 * time.Second

type scanCache[T any] struct {
	mu    sync.Mutex
	built time.Time
	value T
	ready bool
}

func (c *scanCache[T]) get(build func() T) T {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ready && time.Since(c.built) < indexTTL {
		return c.value
	}
	c.value = build()
	c.built = time.Now()
	c.ready = true
	return c.value
}

func (c *scanCache[T]) reset() {
	c.mu.Lock()
	c.ready = false
	c.mu.Unlock()
}
