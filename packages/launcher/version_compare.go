package main

import (
	"strconv"
	"strings"
)

// isNewerVersion 判断 latest 是否严格新于 current，避免把降级误判为更新。
func isNewerVersion(latest, current string) bool {
	left := versionParts(latest)
	right := versionParts(current)
	length := len(left)
	if len(right) > length {
		length = len(right)
	}
	for index := 0; index < length; index++ {
		var a, b int
		if index < len(left) {
			a = left[index]
		}
		if index < len(right) {
			b = right[index]
		}
		if a != b {
			return a > b
		}
	}
	return false
}

func versionParts(value string) []int {
	value = strings.TrimPrefix(strings.TrimSpace(value), "v")
	if index := strings.IndexAny(value, "-+"); index >= 0 {
		value = value[:index]
	}
	parts := make([]int, 0, 3)
	for _, piece := range strings.Split(value, ".") {
		number, err := strconv.Atoi(piece)
		if err != nil {
			number = 0
		}
		parts = append(parts, number)
	}
	return parts
}
