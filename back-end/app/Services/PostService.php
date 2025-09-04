<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Collection;

class PostService
{
    /**
     * Get all posts
     */
    public function getAllPosts(): Collection
    {
        return Post::orderBy('name')->get();
    }

    /**
     * Get a specific post by ID
     */
    public function getPostById(int $id): ?Post
    {
        return Post::find($id);
    }

    /**
     * Get a post by name
     */
    public function getPostByName(string $name): ?Post
    {
        return Post::where('name', $name)->first();
    }

    /**
     * Create a new post
     */
    public function createPost(array $data): Post
    {
        return Post::create($data);
    }

    /**
     * Update an existing post
     */
    public function updatePost(int $id, array $data): ?Post
    {
        $post = Post::find($id);
        if ($post) {
            $post->update($data);
            return $post->fresh();
        }
        return null;
    }

    /**
     * Delete a post
     */
    public function deletePost(int $id): bool
    {
        $post = Post::find($id);
        if ($post) {
            return $post->delete();
        }
        return false;
    }

    /**
     * Search posts by name
     */
    public function searchPosts(string $searchTerm): Collection
    {
        return Post::where('name', 'LIKE', "%{$searchTerm}%")
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Get posts with pagination
     */
    public function getPostsPaginated(int $perPage = 10, int $page = 1): array
    {
        $skip = ($page - 1) * $perPage;
        
        $total = Post::count();
        $posts = Post::orderBy('name')
                     ->skip($skip)
                     ->take($perPage)
                     ->get();
        
        $totalPages = ceil($total / $perPage);
        
        return [
            'posts' => $posts,
            'total' => $total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'perPage' => $perPage
        ];
    }

    /**
     * Check if a post exists by name
     */
    public function postExists(string $name): bool
    {
        return Post::where('name', $name)->exists();
    }

    /**
     * Get posts by multiple IDs
     */
    public function getPostsByIds(array $ids): Collection
    {
        return Post::whereIn('id', $ids)->get();
    }

    /**
     * Create multiple posts at once
     */
    public function createMultiplePosts(array $postsData): Collection
    {
        $posts = collect();
        
        foreach ($postsData as $postData) {
            if (isset($postData['name']) && !$this->postExists($postData['name'])) {
                $post = $this->createPost($postData);
                $posts->push($post);
            }
        }
        
        return $posts;
    }

    /**
     * Get posts count
     */
    public function getPostsCount(): int
    {
        return Post::count();
    }

    /**
     * Get posts with users count
     */
    public function getPostsWithUsersCount(): Collection
    {
        return Post::withCount('users')->orderBy('name')->get();
    }
} 