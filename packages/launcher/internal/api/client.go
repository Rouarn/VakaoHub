package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	BaseURL string
	HTTP    *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

type envelope struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func (c *Client) Catalog(ctx context.Context, platform, arch string) (CatalogResponse, error) {
	endpoint := fmt.Sprintf(
		"%s/catalog?platform=%s&arch=%s",
		c.BaseURL,
		url.QueryEscape(platform),
		url.QueryEscape(arch),
	)

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return CatalogResponse{}, err
	}

	response, err := c.HTTP.Do(request)
	if err != nil {
		return CatalogResponse{}, fmt.Errorf("无法连接分发服务：%w", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 8<<20))
	if err != nil {
		return CatalogResponse{}, err
	}

	var payload envelope
	if err := json.Unmarshal(body, &payload); err != nil {
		return CatalogResponse{}, fmt.Errorf("服务返回格式异常（HTTP %d）", response.StatusCode)
	}
	if response.StatusCode != http.StatusOK || payload.Code != 200 {
		message := payload.Message
		if message == "" {
			message = fmt.Sprintf("HTTP %d", response.StatusCode)
		}
		return CatalogResponse{}, fmt.Errorf("服务返回错误：%s", message)
	}

	var catalog CatalogResponse
	if err := json.Unmarshal(payload.Data, &catalog); err != nil {
		return CatalogResponse{}, err
	}
	return catalog, nil
}
